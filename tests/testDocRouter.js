var docRouter = require('../index').DocRouter;
var connect = require('connect');
var express = require('express');
var request = require('request');

function nope(req, res) {
    res.end(req.body);
}

function mapRouter(app) {
    app.setResourceInfo({
        id: "App",
        params: {
            app: {
                style: "template",
                type: "string",
                required: true
            }
        }
    });

    app.get('/:app', nope,
        {
            id: "App",
            description: "Gets the app"
        });

    app.post('/:app', nope,
        {
            id: "App",
            doc: "Updates the app"
        });
}

exports['test get json'] = function (test) {
    var server = connect.createServer(
        docRouter(connect.router, "boo", mapRouter)
    );
    server.listen(5000);

    request({
            uri: 'http://localhost:5000/*',
            method: 'OPTIONS',
            headers: { accept: 'application/json'}
        },
        function (error, res) {
            if (error) {
                test.fail("Could not get json");
                return;
            }

            var restdoc = JSON.parse(res.body);
            test.ok(restdoc.resources.length == 1);
            server.close();
            test.done();
        });
};

exports['test get html'] = function (test) {
    var server = connect.createServer(
        docRouter(connect.router, "boo", mapRouter)
    );
    server.listen(5000);

    request({
            uri: 'http://localhost:5000/*',
            method: 'OPTIONS',
            headers: { accept: 'text/html'}
        },
        function (error, res) {
            if (error) {
                test.fail("Could not get html");
                return;
            }

          test.ok(~res.body.indexOf('GET</label>'));
            test.ok(~res.body.indexOf('POST</label>'));
          server.close();
            test.done();
        });
};


if (express) {
    exports['test get restdoc with express'] = function (test) {
        var app = express.createServer();

        docRouter(app, "boo");

        app.setResourceInfo({
            id: "App",
            params: {
                app: {
                    required: true
                }
            }
        })

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
                        required: true
                    }
                }
            });

        app.listen(5000);

        request('http://localhost:5000/!!', function (error, res) {
            if (error) {
                test.fail("Could not get restdoc");
                return;
            }

            var restdoc = JSON.parse(res.body);
            test.ok(restdoc.resources.length == 1);
            test.ok(restdoc.resources[0].methods.GET);
            test.ok(restdoc.resources[0].methods.POST);
            app.close();
            test.done();
        });
    };
}

