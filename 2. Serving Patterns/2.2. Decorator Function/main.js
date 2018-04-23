module.exports = {
    handler: (req, res) => {
        console.log(req.body);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(req.body));
    }
};