// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Connection string for the IoT Hub service
//
// NOTE:
// For simplicity, this sample sets the connection string in code.
// In a production environment, the recommended approach is to use
// an environment variable to make it available to your application
// or use an x509 certificate.
// https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-security

var KeyVault = require('azure-keyvault');
var AuthenticationContext = require('adal-node').AuthenticationContext;

var clientId = "5f14da2b-4d0a-40d9-b5ea-2da07333ff30";
var clientSecret = "18IsbjMu[W]LYt24OvZYVHbNwPbzv[A/";
var vaultUri = "https://keyvault-cjm-test.vault.azure.net/";

//Authenticator - Retrieves Access token
var authenticator = function(challenge, callback){
      
  //create a new auth context
  var context = new AuthenticationContext(challenge.authorization);

  //use the context to acquire an authentication token.
  return context.acquireTokenWithClientCredentials(challenge.resource, clientId, clientSecret, function(err, tokenResponse){
    if (err) throw err;

    //calculate the value to be set in the request's Authorization header and resume the call
    var authortizationValue = tokenResponse.tokenType + ' ' + tokenResponse.accessToken;

    return callback(null, authortizationValue);
  });
};

var credentials = new KeyVault.KeyVaultCredentials(authenticator);
var client = new KeyVault.KeyVaultClient(credentials);

let secretName = 'jsSimDevice-servicestring';

let secretVersion = ''; //leave blank to get the latest version;

client.getSecret(vaultUri, secretName, secretVersion).then((result) => {
  // Using the Azure CLI:
  // az iot hub show-connection-string --hub-name {YourIoTHubName} --policy-name service  --output table
  var connectionString = result.value;

  // Using the Node.js SDK for Azure Event hubs:
  //   https://github.com/Azure/azure-event-hubs-node
  // The sample connects to an IoT hub's Event Hubs-compatible endpoint
  // to read messages sent from a device.
  var { EventHubClient, EventPosition } = require('@azure/event-hubs');

  var printError = function (err) {
    console.log(err.message);
  };

  // Display the message content - telemetry and properties.
  // - Telemetry is sent in the message body
  // - The device can add arbitrary application properties to the message
  // - IoT Hub adds system properties, such as Device Id, to the message.
  var printMessage = function (message) {
    console.log('Telemetry received: ');
    console.log(JSON.stringify(message.body));
    console.log('Application properties (set by device): ')
    console.log(JSON.stringify(message.applicationProperties));
    console.log('System properties (set by IoT Hub): ')
    console.log(JSON.stringify(message.annotations));
    console.log('');
  };

  // Connect to the partitions on the IoT Hub's Event Hubs-compatible endpoint.
  // This example only reads messages sent after this application started.
  var ehClient;
  EventHubClient.createFromIotHubConnectionString(connectionString).then(function (client) {
    console.log("Successfully created the EventHub Client from iothub connection string.");
    ehClient = client;
    return ehClient.getPartitionIds();
  }).then(function (ids) {
    console.log("The partition ids are: ", ids);
    return ids.map(function (id) {
      return ehClient.receive(id, printMessage, printError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) });
    });
  }).catch(printError);
})