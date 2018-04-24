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

// We will not mess with the /alive endpoint, because that triggers the killing and recreation of the container by Kubernetes
app.get('/alive', (req, res) => {

    console.log('/alive');

    res.status(200).send('OK');
});

// We will use the /ready endpoint as the health check for the Circuit Breaker configuration in NGINX (see nginx-configmap.yaml)
app.get('/ready', (req, res) => {

    console.log('/ready');

    // If we are in error mode, we'll just return a 503
    if (fakeAnError) {
        res.status(503).send('BUSY FROM ' + req.connection.localAddress);
    } else
        if (!ready) {
            res.status(503).send('BUSY FROM ' + req.connection.localAddress);
        } else {
            res.status(200).send('OK FROM ' + req.connection.localAddress);
        }
});

// This will be our main endpoint which we will be calling in our test case that returns some valid response
app.get('/', (req, res) => {

    console.log('/');

    if (!fakeAnError) {
        res.status(200).send('SOMERESPONSE FROM ' + req.connection.localAddress);
    } else {
        // Have a non-blocking delay in the response of this endpoint that waits more than the request/read timeout configured in the NGINX configuration, for more a realistic test
        setTimeout(() => {
            res.status(503).send('ERROR FROM ' + req.connection.localAddress);
        }, 30000);
    }

});

// These 2 endpoints will toggle the "fakeerror" mode on/off for subsequent requests
app.post('/fakeerrormodeon', (req, res) => {

    console.log('/fakeerrormodeon');

    fakeAnError = true;
    res.status(200).send('OK FROM ' + req.connection.localAddress);
});
app.post('/fakeerrormodeoff', (req, res) => {

    console.log('/fakeerrormodeoff');

    fakeAnError = false;
    res.status(200).send('OK FROM ' + req.connection.localAddress);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

// All is done? Then mark this server ready
ready = true;

