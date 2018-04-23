// Subscribe to event hub "animatedgifevent" and process the media stored in Azure Blob Storage by firing up an FFMPEG docker container, and then send a "animatedgifreadyevent" to the Event Hub
'use strict';

// We will implement a small API for liveness and readiness probing
const express = require('express');
// Azure Blob Storage 
const azure = require('azure-storage');

// const localSettings = require('./local.settings');
var localSettings = {
    connectionStrings: {
        eventHub: process.env.EVENT_HUB_CONNECTION_STRING,
        storageAccount: process.env.STORAGE_ACCOUNT_CONNECTION_STRING
    }
}

var blobSvc = azure.createBlobService(localSettings.connectionStrings.storageAccount);
// The name of the Blob Container that was created running the azuredeploy.json template
var blobContainerName = 'batchprocessingthumbnailgenerator';
// The HTTPS endpoint to the Azure Blob Storage. Note: for demo purposes we will make the Azure Blob storage publicly accessible so FFMPEG can get it there. However in production scenarios we suggest to bindmount a folder and injeect the input media in the FFMPEG child container for FFMPEG to get it there.

// Azure Event Hub
var EventHubClient = require('azure-event-hubs').Client;

// Incoming Event Hub Client: 
// Name of the "animatedgif" Event
var incomingEventHubPath = 'animatedgifevent';
var incomingEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, incomingEventHubPath);

// Outgoing Event Hub Client: 
// Name of the "Join" Event 
var outgoingEventHubPath = 'animatedgifreadyevent';
var outgoingEventHubClient = EventHubClient.fromConnectionString(localSettings.connectionStrings.eventHub, outgoingEventHubPath);

// Docker: To fire up the FFMPEG Docker container within this container
const { Docker } = require('node-docker-api');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
// To write file streams from the FFMPEG container to the local file system
const fs = require('fs');
// To extract the file stream from the FFMPEG container through the Node-Docker-API (which is in TAR format) to get the FFMPEG output file
const tar = require('tar-stream');

// Turn the callbacks into a nice promise
const promisifyStream = (stream) => new Promise((resolve, reject) => {
    stream.on('data', (d) => console.log(d.toString()))
    stream.on('end', resolve)
    stream.on('error', reject)
})

// For the readiness probe we will set ready to true after this container has finished preparing the FFMPEG docker image
var ready = false;
console.log('Container is not yet ready.');

// Web Interface for liveness and readiness probes
const PORT = 8083;
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

// Worker Interface: We will listen for the "animatedgif" on Event Hub to trigger the creation of an FFMPEG container and then get the incoming media file from Azure Blob storage, process it, and then store it back in Azure Blob Storage under a new name

// Prepare the image so that we can use it to fire up Docker containers based on it
docker.image.create({}, { fromImage: 'jrottenberg/ffmpeg', tag: 'latest' })
    .then(stream => promisifyStream(stream))
    .then(() => docker.image.get('jrottenberg/ffmpeg').status())
    .then(image => image.history())
    .then(events => {

        // Now this container can be deemed "ready"
        ready = true;
        console.log('Container is ready.');

        // Open the Event Hub client so we can listen to the animatedgif events
        incomingEventHubClient.open()
            .then(incomingEventHubClient.getPartitionIds.bind(incomingEventHubClient))
            .then(function (partitionIds) {

                return partitionIds.map(function (partitionId) {
                    return incomingEventHubClient.createReceiver('$Default', '0', { startAfterTime: Date.now() }).then(rx => {

                        rx.on('errorReceived', (err) => { console.log('Event Hub Create Receiver Error: ' + err); });
                        rx.on('message', (message) => {

                            //TODO: Make this Azure Blob Storage triggered...

                            // Ok, we got an incoming animatedgifevent
                            console.log('Event Hub Incoming Message: ' + JSON.stringify(message.body));

                            // Let's get the filename, email of the sender from the event message body
                            var fileName = message.body.fileName;
                            var email = message.body.email;
                            var logs = '';

                            // Copy Azure Blob media source file to local /tmp folder (in the host container)
                            blobSvc.getBlobToLocalFile(blobContainerName, fileName, '/tmp/' + fileName, (error, result, response) => {
                                if (!error) {

                                    // blob retrieved
                                    console.log('Original blob stored in /tmp folder');

                                    var fileUrl = blobSvc.getUrl(blobContainerName, fileName);
                                    // The destination file will have a postfix _t, indicating it is an animated gif version
                                    var destinationFileName = fileName.substr(0, fileName.lastIndexOf('.')) + '.gif';

                                    // Now, let's fire up a Docker image of the FFMPEG tool
                                    return docker.container.create({
                                        Image: 'jrottenberg/ffmpeg',
                                        // Give it a unique name
                                        name: 'ffmpeg-' + fileName.toLowerCase().replace('.', '-') + '-' + Date.now().toString(),
                                        // To avoid the complexity of mounting and binding volumes, we directly access the Azure Blob Storage publicly, throught its HTTPS endpoint, straight into the FFMPEG tool
                                        // This FFMPEG command line will take the source file straight from the Azure Blob Storage and create a 120px width Animated GIF of it (because of the .gif in the output file name)
                                        Cmd: ['-y', '-i', fileUrl, '-vf', 'scale=120:-1', '/tmp/' + destinationFileName],
                                        AttachStdout: true,
                                        AttachStderr: true,
                                        Detach: false
                                        // Start the container, which will immediately fire the FFMPEG command line
                                        // { Detach: false } 
                                    }).then(container => {

                                        console.log('FFMPEG container started');

                                        return container.start();

                                    })
                                        .then(container => {

                                            docker.events().then((stream) =>
                                                stream.on('data', (d) => {
                                                    console.log('docker events stream data:');
                                                    var e = JSON.parse(d.toString());
                                                    console.log('e = ' + JSON.stringify(e));
                                                    if (e.Action == 'die' && e.Actor.ID == container.id) {

                                                        console.log('Getting TAR stream from container');

                                                        // Now, let's go into the FFMPEG container and get the output file that was created by FFMPEG and copy it to the host container
                                                        container.fs.get({ path: '/tmp/' + destinationFileName }).then(tarstream => {

                                                            console.log('Extracting TAR stream from container');

                                                            // Because the Docker API will return a TAR stream, rather than the actual file, we have to extract the TAR stream first
                                                            var extract = tar.extract();
                                                            var data = new Buffer(0);

                                                            // Extract the TAR stream in chunks
                                                            extract.on('entry', (header, untarstream, cb) => {

                                                                untarstream.on('data', (chunk) => {

                                                                    // We are only interested in the FFMPEG output from the TAR stream
                                                                    if (header.name == destinationFileName) {
                                                                        data = Buffer.concat([data, chunk]);
                                                                    }
                                                                });

                                                                untarstream.on('end', () => {

                                                                    // Now we should have output file created by the FFMPEG container in the data Buffer
                                                                    console.log('Writing the untarred file to ' + '/tmp/' + destinationFileName + ', Length: ' + data.length);

                                                                    // Let's write out the Buffer to our host container's /tmp folder
                                                                    fs.writeFile('/tmp/' + destinationFileName, data, (err) => {

                                                                        if (!err) {

                                                                            console.log('Storing the file tmp/' + destinationFileName + ' in Azure Blob Storage');

                                                                            // Store output from FFMPEG back in a blob under its new name
                                                                            blobSvc.createBlockBlobFromLocalFile(blobContainerName, destinationFileName, '/tmp/' + destinationFileName, (error, result, response) => {
                                                                                if (error) {
                                                                                    console.log('Error storing blob: ' + JSON.stringify(error));
                                                                                } else {
                                                                                    console.log('Success. FFMPEG Output stored in Azure Blob Storage.');

                                                                                    // Send event to JoinEvent hub
                                                                                    outgoingEventHubClient.open().then(() => {
                                                                                        return outgoingEventHubClient.createSender('0'); //'0'
                                                                                    }).then((tx) => {

                                                                                        var message = {
                                                                                            fileName: fileName,
                                                                                            email: email
                                                                                        }

                                                                                        console.log('Sending message: ' + JSON.stringify(message));

                                                                                        tx.on('errorReceived', (err) => { console.log(err); });
                                                                                        tx.send(message, '0'); // , '0' // message

                                                                                    });



                                                                                };

                                                                            });
                                                                        } else {
                                                                            console.log('Error writing file to local file system');
                                                                        }


                                                                    });


                                                                });

                                                                untarstream.resume();

                                                            });

                                                            console.log('Start pipe');
                                                            // Read the tarstream, send it to the extracter
                                                            tarstream.pipe(extract);
                                                            console.log('Finished pipe');

                                                            return promisifyStream(tarstream);

                                                        }).catch(error => console.log(error));


                                                    }
                                                }
                                                ));


                                            console.log('Get the logs from the FFMPEG container');

                                            // Then, let's get the log output so we can see what is going on..
                                            return container.logs({
                                                follow: true,
                                                stdout: true,
                                                stderr: true
                                            }).then(logstream => {

                                                // The log output will be coming in as a stream
                                                logstream.on('data', info => {
                                                    logs += info.toString('utf8');
                                                })

                                                logstream.on('error', err => console.log('Log Stream Error: ' + err));

                                                // The complete log has been streamed, print it to the console output
                                                logstream.on('end', () => {
                                                    console.log('Log Files from FFMPEG Container: ' + logs);
                                                });


                                            })

                                        });
                                }

                            });
                        });
                    })

                });
            }).catch(error => {
                console.log('EventHub error: ' + error);
            })


    })
    .catch(error => {
        ready = false;
        console.log('Container is not ready.');
        console.log('Docker image creation error:' + error)
    });

