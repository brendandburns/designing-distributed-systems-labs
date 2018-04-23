// This is a little NodeJS server that mimicks a production service that we want to protect with a Circuit Breaker. 
// To prove the Circuit Breaker works and stops overloading this service with calls when it is in a transient failure so it can recover, we need to fake this service to become unreachable.
// In order to mimick this service to become unreachable for clients, we'll expose an endpoint that you can call so that this service starts behaving like it is crashed.
// We'll fake this crash by calling a non-blocking setTimeout() statement on incoming requests, when we are in this "fake error" mode.
// We will also expose an endpoint to get this service out of the "fake error" mode so that triggers the Circuit Breaker to go in half-open state, before returning to fully closed state (=fully working state)
'use strict';

const express = require('express');

var ready = false;
console.log('Container is not yet ready.');

const PORT = 80;
const HOST = '0.0.0.0';
const app = express();

// We will be using this boolean to mimick an issue with this service
var fakeAnError = false;

app.get('/alive', (req, res) => {

    // In order for Kubernetes not to kill and restart our container in this test scenario, we always have to return /alive OK 
    // Otherwise we can't show the NGINX Circuit Breaker at work in detail (as Kubernetes would automatically take care of issues and restart a container if it would become unavailable)
    // In production scenarios 
    //if (!fakeAnError) {
        res.status(200).send('OK');
    //} else {

        // Have a non-blocking delay in the response of this endpoint that waits more than the request/read timeout configured in the NGINX configuration
      //  setTimeout(() => {
        //    res.status(503).send('ERROR');
        //}, 30000)

    //}

});

app.get('/ready', (req, res) => {

    // If we are in error mode, wait a while before sending back a result... just like if we had a real issue in the container...
    if (fakeAnError) {
       // setTimeout(() => {
            // Since this is in the time out callback, this may cause an error if res is already released
            res.status(503).send('BUSY');
       // }, 30000)
    } else
        if (!ready) {
            res.status(503).send('BUSY');
        } else {
            res.status(200).send('OK');
        }

});
//app.get('/healthz', (req, res) => {

//    if (!fakeAnError) {
//        res.status(200).send('OK');
//    } else {

//        // Have a non-blocking delay in the response of this endpoint that waits more than the request/read timeout configured in the NGINX configuration
//        setTimeout(() => {
//            res.status(503).send('ERROR');
//        }, 30000)

//    }

//});
//app.get('/somerequest', (req, res) => {

//    if (!fakeAnError) {
//        res.status(200).send('SOMERESPONSE');
//    } else {

//        // Have a non-blocking delay in the response of this endpoint that waits more than the request/read timeout configured in the NGINX configuration
//        setTimeout(() => {
//            res.status(503).send('ERROR');
//        }, 30000)

//    }

//});
app.get('/', (req, res) => {

    if (!fakeAnError) {
        res.status(200).send('SOMERESPONSE');
    } else {

        // Have a non-blocking delay in the response of this endpoint that waits more than the request/read timeout configured in the NGINX configuration
        //setTimeout(() => {
            res.status(503).send('ERROR');
       // }, 30000)

    }

});

// These 2 endpoints will toggle the "fakeerror" mode on/off for subsequent requests
app.post('/fakeerrormodeon', (req, res) => {
    fakeAnError = true;
    res.status(200).send('OK');
});
app.post('/fakeerrormodeoff', (req, res) => {
    fakeAnError = false;
    res.status(200).send('OK');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

ready = true;

