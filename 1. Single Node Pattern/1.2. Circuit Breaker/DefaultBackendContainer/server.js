// This is a little NodeJS server that serves 404 errors on it's root endpoint / and 200 on a /healthz endpoint
'use strict';

const express = require('express');

const PORT = 80;
const HOST = '0.0.0.0';
const app = express();

app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});
app.get('/', (req, res) => {
    res.status(404).send('NOTFOUND');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
