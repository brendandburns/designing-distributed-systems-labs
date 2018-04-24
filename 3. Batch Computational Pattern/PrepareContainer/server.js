// PrepareContainer: Entry point of the event-chain, an HTTP Post to this container will trigger the Filter, Splitter and Copier functions and depending on the incoming media the ThumbnailContainer, AnimatedGIFContainer and FrameCaptureContainer

'use strict';

const express = require('express');
const azure = require('azure-storage');
const uuidv1 = require('uuid/v1');
//const localSettings = require('./local.settings');
var localSettings = {
    connectionStrings: {
        eventHub: process.env.EVENT_HUB_CONNECTION_STRING,
        storageAccount: process.env.STORAGE_ACCOUNT_CONNECTION_STRING
    }
}

console.log('localSettings = ' + JSON.stringify(localSettings));

var streamifier = require('streamifier');
var multiparty = require('multiparty');
var EventHubClient = require('azure-event-hubs').Client;
var Promise = require('bluebird');

// Thumbnail Event Client
var thumbnailEventHubPath = 'thumbnailevent';
var thumbnailEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, thumbnailEventHubPath);

// Notify Event Hub Client: 
// Name of the "Notify" Event 
var notifyEventHubPath = 'notifyevent';
var notifyEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, notifyEventHubPath);

// Notify Event Hub Client: 
// Name of the "framecaptureevent" Event
var framecaptureEventHubPath = 'framecaptureevent';
var framecaptureEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, framecaptureEventHubPath);

// Notify Event Hub Client: 
// Name of the "animatedgif" Event
var animatedgifEventHubPath = 'animatedgifevent';
var animatedgifEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, animatedgifEventHubPath);

var blobSvc = azure.createBlobService(localSettings.connectionStrings.storageAccount);
// The name of the Blob Container that was created running the azuredeploy.json template
var blobContainerName = 'batchprocessingthumbnailgenerator';

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';
const approvedExtensionRegex = /[^\s]+(\.(gif|jpg|jpeg|png|mp4|avi|mpg))$/i;
const approvedVideoExtensionRegex = /[^\s]+(\.(mp4|avi|mpg))$/i;

// App
const app = express();

// Liveliness probe
app.get('/alive', (req, res) => {

    res.status(200).send('OK');

});
// Readiness probe
app.get('/ready', (req, res) => {
    
    res.status(200).send('OK');

});
app.post('/prepare', (req, res) => {

    console.log('/prepare');

    // Get the uploaded POST FORMDATA
    var form = new multiparty.Form();

    form.on('part', function (part) {

        console.log('part = ' + JSON.stringify(part));
        console.log('req.query = ' + JSON.stringify(req.query));

        // Make sure we have a filename
        if (!part.filename) {

            res.status(500).send("Please supply a filename");

            // Make sure we have an email querystring parameter of the user to notify once the workflow has finished
        } else if (!req.query.email) {

            res.status(500).send("Please supply an e-mail address as a query parameter to notify when the media has been processed.");

        } else {

            // Process the POST FORMDATA file
            var size = part.byteCount;
            var fileName = part.filename;
            var container = 'blobContainerName';
            var email = req.query.email;

            // If the blob container 'batchprocessing' does not yet exist, create it
            blobSvc.createContainerIfNotExists(blobContainerName, function (error, result, response) {
                if (!error) {

                    // Then, store the POST FORMDATA file as blob in Azure Blob Storage
                    blobSvc.createBlockBlobFromStream(blobContainerName, fileName, part, size, function (error, result, response) {
                        if (!error) {
                            // file uploaded
                            res.status(200).send('Data Received');

                            // Filter Pattern: If this is a format we do not support, we go straight to the NotifyContainer
                            if (!approvedExtensionRegex.test(fileName)) {
                                
                                //TODO: Store Job Status "Notify" in Cosmos DB
                                console.log('Goto Notify');

                                // Send event to JoinEvent hub
                                notifyEventHubClient.open().then(() => {
                                    return notifyEventHubClient.createSender('0'); 
                                }).then((tx) => {

                                    var message = {
                                        fileName: fileName,
                                        email: email,
                                        error: 'UNSUPPORTED FORMAT' 
                                    }

                                    console.log('Sending message: ' + JSON.stringify(message));

                                    tx.on('errorReceived', (err) => { console.log(err); });
                                    tx.send(message, '0'); 

                                });

                            } else {

                                // Split Pattern
                                if (approvedVideoExtensionRegex.test(fileName)) {

                                       // Copy Pattern

                                    //Fire "FrameCaptureEvent" 
                                    framecaptureEventHubClient.open().then(function () {
                                        return framecaptureEventHubClient.createSender('0');
                                    }).then(function (tx) {

                                        var message = {
                                            fileName: fileName,
                                            email: email
                                        }

                                        console.log('Sending FrameCaptureEvent message ' + JSON.stringify(message));

                                        tx.on('errorReceived', function (err) { console.log(err); });
                                        tx.send(message, '0'); 
                                    });


                                    //Fire "animatedgif" Event

                                    animatedgifEventHubClient.open().then(function () {
                                        return animatedgifEventHubClient.createSender('0');
                                    }).then(function (tx) {

                                        var message = {
                                            fileName: fileName,
                                            email: email
                                        }

                                        console.log('Sending AnimatedGifEvent message ' + JSON.stringify(message));

                                        tx.on('errorReceived', function (err) { console.log(err); });
                                        tx.send(message, '0');
                                    });


                                } else {

                                 

                                    //Fire "ThumbnailEvent" Event
                                    thumbnailEventHubClient.open().then(function () {
                                        return thumbnailEventHubClient.createSender('0');
                                    }).then(function (tx) {

                                        var message = {
                                            fileName: fileName,
                                            email: email
                                        }

                                        console.log('Sending ThumbnailEvent message ' + JSON.stringify(message));

                                        tx.on('errorReceived', function (err) { console.log(err); });
                                        tx.send(message, '0'); 
                                        });


                                  
                                }

                            }



                        } else {

                            res.status(500).send(error);

                        }
                    });


                } else {
                    res.status(500).send(error);
                }
            });

        }
    });

    form.parse(req);

});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);