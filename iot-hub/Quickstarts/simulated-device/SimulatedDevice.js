// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// The device connection string to authenticate the device with your IoT hub.
//
// NOTE:
// For simplicity, this sample sets the connection string in code.
// In a production environment, the recommended approach is to use
// an environment variable to make it available to your application
// or use an HSM or an x509 certificate.
// https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-security
//

//Azure Key Vault
//Azure Key vault implementation
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

let secretName = 'jsSimDevice-hubstring';

let secretVersion = ''; //leave blank to get the latest version;

client.getSecret(vaultUri, secretName, secretVersion).then((result) => {
  // Using the Azure CLI:
  // az iot hub device-identity show-connection-string --hub-name {YourIoTHubName} --device-id MyNodeDevice --output table
  var connectionString = result.value;

  // Using the Node.js Device SDK for IoT Hub:
  //   https://github.com/Azure/azure-iot-sdk-node
  // The sample connects to a device-specific MQTT endpoint on your IoT Hub.
  var Mqtt = require('azure-iot-device-mqtt').Mqtt;
  var DeviceClient = require('azure-iot-device').Client
  var Message = require('azure-iot-device').Message;

  var client = DeviceClient.fromConnectionString(connectionString, Mqtt);

  // Create a message and send it to the IoT hub every second
  setInterval(function(){
    // Simulate telemetry.
    var temperature = 20 + (Math.random() * 15);
    var message = new Message(JSON.stringify({
      temperature: temperature,
      humidity: 60 + (Math.random() * 20)
    }));

    // Add a custom application property to the message.
    // An IoT hub can filter on these properties without access to the message body.
    message.properties.add('temperatureAlert', (temperature > 30) ? 'true' : 'false');

    console.log('Sending message: ' + message.getData());

    // Send the message.
    client.sendEvent(message, function (err) {
      if (err) {
         console.error('send error: ' + err.toString());
      } else {
        console.log('message sent');
      }
    });
  }, 1000);
})

