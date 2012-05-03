var docRouter = require('../index').DocRouter;
var express = require('express');

var app = express.createServer();

docRouter(app, "http://mydomain.com");

var r = app.setResourceInfo({
    id: "App",
    params: {
        app: {
            description: "the app entry id",
            required: true
        }
    }
});

app.get('/:app', nope,
    {
        id: "App",
        description: "Gets the app",
    });

app.post('/:app', nope,
    {
        id: "App",
        description: "Updates the app",
        params: {
            app: {
                description: "the app entry to update",
                required: true
            }
        }
    });

app.listen(5000);

console.log('started server on http://localhost:5000');

function nope(req, res) {
    res.end(req.body);
}

