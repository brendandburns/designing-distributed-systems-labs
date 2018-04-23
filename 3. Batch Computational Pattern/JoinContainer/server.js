// Subscribe to event hub "framecaptureevent" and "animatedgifevent" and if both are received, send out the "notificationevent" event to the Event Hub
'use strict';

// We will implement a small API for liveness and readiness probing
const express = require('express');
//const localSettings = require('./local.settings');
var localSettings = {
    connectionStrings: {
        eventHub: process.env.EVENT_HUB_CONNECTION_STRING
    }
}

console.log('localSettings = ' + JSON.stringify(localSettings));

// Azure Event Hub
var EventHubClient = require('azure-event-hubs').Client;

// Incoming Event Hub Client: 
// Name of the "FrameCapture" Event 
var framecapturereadyEventHubPath = 'framecapturereadyevent';
var framecapturereadyEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, framecapturereadyEventHubPath);

// Name of the "AnimatedGIF" Event 
var animatedgifreadyEventHubPath = 'animatedgifreadyevent';
var animatedgifreadyEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, animatedgifreadyEventHubPath);

// Outgoing Event Hub Client: 
// Name of the "Join" Event 
var outgoingEventHubPath = 'notifyevent';
var outgoingEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, outgoingEventHubPath);

// For the readiness probe we will set ready to true after this container has finished preparing the FFMPEG docker image
var ready = false;
console.log('Container is not yet ready.');

// To implement the Join (or also called Barrier-synchronization) we will be using a little 3rd party NodeJS library that helps us clarify the Join-pattern
var simpleBarrier = require('simple-barrier');

// Web Interface for liveness and readiness probes
const PORT = 8084;
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

// create a barrier instance
var barrier = simpleBarrier();

// Handle the incoming FrameCaptureReady events
framecapturereadyEventHubClient.open()
    .then(framecapturereadyEventHubClient.getPartitionIds.bind(framecapturereadyEventHubClient))
    .then( (partitionIds) => {

        return partitionIds.map( (partitionId) => {
            return framecapturereadyEventHubClient.createReceiver('$Default', '0', { startAfterTime: Date.now() }).then(rx => {

                rx.on('errorReceived', (err) => { console.log('FrameCapture Ready Event Hub Create Receiver Error: ' + err); });
                rx.on('message',
                    // A call to waitOn() will be registered by the barrier, and the barrier will gather all the callbacks that are added and the barrier will call the endWith() callback unless all expected callbacks are accounted for.
                    barrier.waitOn((message) => {
                        return message.body;
                     })
                );
            })

        });
    }).catch(error => {
        console.log('FrameCapture Ready EventHub error: ' + error);
    });

// Handle the incoming AnimatedGIFReady events
animatedgifreadyEventHubClient.open()
    .then(animatedgifreadyEventHubClient.getPartitionIds.bind(animatedgifreadyEventHubClient))
    .then((partitionIds) => {

        ready = true;

        return partitionIds.map((partitionId) => {
            return animatedgifreadyEventHubClient.createReceiver('$Default', '0', { startAfterTime: Date.now() }).then(rx => {

                rx.on('errorReceived', (err) => { console.log('AnimatedGIF Ready Event Hub Create Receiver Error: ' + err); });
                rx.on('message', 
                    // A call to waitOn() will be registered by the barrier, and the barrier will gather all the callbacks that are added and the barrier will call the endWith() callback unless all expected callbacks are accounted for.
                    barrier.waitOn((message) => {
                        return message.body;
                    })
                );
            })

        });
    }).catch(error => {
        console.log('AnimatedGIF Ready EventHub error: ' + error);
    });

// This is the callback that the barrier will callback if all the "Ready" callbacks are accounted for, therefore acting as a JOIN
barrier.endWith((results) => {

    let fileName;
    let email;

    //NOTE: For now we assume all incoming messages are for one and the same batch (=one filename). In production scenarios, the barrier-sychronization needs to take in account that the container is handling multiple batch (= multiple filenames) at the same time.
    results.forEach((body) => {
        console.log('Event Hub Incoming Message: ' + JSON.stringify(body));
    // Let's get the filename, email of the sender from the event message body
        fileName = body.fileName;
        email = body.email;
    });

    // Now, let's notify the end user by calling the final stage in the Event Driven Batch Process: "NotifyEvent"
    // Fire "NotifyEvent" Event
    outgoingEventHubClient.open().then( () => {
        return outgoingEventHubClient.createSender('0');
    }).then((tx) => {

        var message = {
            fileName: fileName,
            email: email
        }

        console.log('Sending NotifyEvent message ' + JSON.stringify(message));

        tx.on('errorReceived', (err) => { console.log(err); });
        tx.send(message, '0');
    });

})