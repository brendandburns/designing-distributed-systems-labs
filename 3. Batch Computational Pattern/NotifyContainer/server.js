// Subscribe to event hub "notifyenvent" and send an email to the end-user
'use strict';

// We will implement a small API for liveness and readiness probing
const express = require('express');
const nodemailer = require('nodemailer');
var localSettings = require('./local.settings');

localSettings.connectionStrings = {
    eventHub : process.env.EVENT_HUB_CONNECTION_STRING
};

console.log('localSettings = ' + JSON.stringify(localSettings));

// Azure Event Hub
var EventHubClient = require('azure-event-hubs').Client;

// Incoming Event Hub Client: 
// Name of the "notifyevent" Event 
var incomingEventHubPath = 'notifyevent';
var incomingEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, incomingEventHubPath);

var ready = false;
console.log('Container is not yet ready.');

const PORT = 8085;
const HOST = '0.0.0.0';
const app = express();

app.get('/alive', (req, res) => {

    res.status(200).send('OK');

});
app.get('/ready', (req, res) => {

    if (!ready) {
        res.status(503).send('BUSY');
    } else {
        res.status(200).send('OK');
    }

});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

ready = true;

incomingEventHubClient.open()
    .then(incomingEventHubClient.getPartitionIds.bind(incomingEventHubClient))
    .then((partitionIds) => {

        return partitionIds.map((partitionId) => {
            return incomingEventHubClient.createReceiver('$Default', '0', { startAfterTime: Date.now() }).then(rx => {

                rx.on('errorReceived', (err) => { console.log('Notify Event Hub Create Receiver Error: ' + err); });
                rx.on('message', (message) => {

                    console.log('Event Hub Incoming Message: ' + JSON.stringify(message.body));

                    var fileName = message.body.fileName;
                    var email = message.body.email;

                    //Send notification to end-user
                    let transporter = nodemailer.createTransport(

                        ttings.mailConfig);

                    let mail = {
                        from: email,
                        to: email,
                        subject: 'File has finished processing',
                        text: 'Your file ' + fileName + ' has finished processing. The destination media files can be found in your Azure Blob Storage container.'
                    };

                    transporter.sendMail(mail, (error, info) => {
                        if (error) {
                            console.log('Error occurred');
                            console.log(error.message);
                        } else {
                            console.log('Message sent successfully!');
                        }

                    });


                })

            });
        });

    }).catch(error => {
        console.log('Notify EventHub error: ' + error);
    });