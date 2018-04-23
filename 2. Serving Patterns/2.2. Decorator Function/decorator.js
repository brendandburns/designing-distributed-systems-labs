const http = require('http');

module.exports = {
    handler: (req, res) => {
        console.log(req.body);

        var obj = req.body;
        if (obj['Name'] === undefined) {
            obj['Name'] = 'Nameless';
        }
        if (obj['Color'] === undefined) {
            obj['Color'] = 'Transparent';
        }

        var options = {
            hostname: '52.165.18.22',
            port: 8080,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        var request = http.request(options, (respone) => {

            let data = '';

            respone.on('data', (chunk) => {
                data += chunk;
                console.log('data =' + data);
            });

            respone.on('end', () => {
                console.log('data =' + data);
                res.setHeader('Content-Type', 'application/json');
                res.end(data);
            });

        });

        request.on('error', (err) => {
            console.log('Error: ' + err.message);
            res.end('Error: ' + err.message);
        });

        request.write(JSON.stringify(obj));
        request.end();

    }
};