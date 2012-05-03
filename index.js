var jade = require('jade'),
    fs = require('fs'),
    methods = require('./methods'),
    path = require('path');

var jadeTemplate = fs.readFileSync(path.join(__dirname, 'doc.jade'), 'utf8');

var extendObject = function(target) { // copied from https://github.com/documentcloud/underscore
     var i = 1, length = arguments.length, source;
     for ( ; i < length; i++ ) {
         // Only deal with defined values
         if ( (source = arguments[i]) != undefined ) {
             Object.getOwnPropertyNames(source).forEach(function(k){
                                                            var d = Object.getOwnPropertyDescriptor(source, k) || {value:source[k]};
                                                            if (d.get) {
                                                                target.__defineGetter__(k, d.get);
                                                                if (d.set) target.__defineSetter__(k, d.set);
                                                            }
                                                            else if (target !== d.value) {
                                                                target[k] = d.value;
                                                            }
                                                        });
         }
     }
     return target;
 };


var DocRouter = function (connectRouter, baseUrl) {
    if (!connectRouter) throw new Error("Connect router function is missing.");
    if (!baseUrl) throw new Error("A base url is missing.");

    this.connectRouter = null;
    this.restdoc = { headers: {}, resources : [] };
    this.baseUrl = baseUrl;
    this.wadl = null;

    var self = this;
    if (typeof connectRouter === "function") {
        this.connectRouterReturn = connectRouter(function (router) {
            self.connectRouter = router;
        });
    } else {
        self.connectRouter = connectRouter;
    }

    function getResource(id) {
        var i;
        var resources = self.restdoc.resources;
        
        for (i=0; i<resources.length; i++) {
            if (resources[i].id === id) {
                return resources[i];
            }
        }

        return null;
    }

    this.connectRouter.get("/!!", function (req, res) {
        getDescription(req, res);
    });

    this.connectRouter.options(/\/?[*]/g, function (req, res) {
        getDescription(req, res);
    });

    this.connectRouter.options("/:resource", function (req, res) {
        var resource = getResource(req.params.resource) || {};

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(resource));
    });

    this.connectRouter.setResourceInfo = function(resource) {
        if (!resource) {
            throw new Error("resource must be provided");
        }
        if (!resource.id) {
            throw new Error("resource must include an id");
        }

        var existingResource = getResource(resource.id);

        if (!existingResource) {
            existingResource = { id: resource.id, methods: {} };
            self.restdoc.resources.push(existingResource);
        }

        return extendObject(existingResource, resource);
    }

    this.connectRouter.setHeadersInfo = function(headers) {
        headers = headers || {};
        return extendObject(self.restdoc.headers, headers);
    }

    var method,
        i,
        l;

    for (i = 0, l = methods.length; i < l; i++) {
        method = methods[i];
        // override the original router method
        this.connectRouter[method] = (function (method, originalMethodFunction) {
            return function (route) {
                var args = arguments;
                var handlersCount = args.length;
                // Multiple arguments may exist for multiple middlewares. The Json describing the method is the last argument.
                var methodJson = {};
                if (typeof(args[args.length - 1]) === 'object'){
                    methodJson = args[args.length - 1];
                    handlersCount -= 1;
                }
                method = method.toUpperCase();
                methodJson.path = route;

                methodJson.description = methodJson.description || methodJson.doc;

                // add backward support for style field (query/template)
                if (method.params) {
                    var param;
                    for (param in method.params) {
                        if (!param.style) {
                            param.style = ~route.indexOf('{?' + param + '}') ? "query" : "template";
                        }
                    }
                }

                var id = methodJson.id || methodJson.path;
                var resource = getResource(id) || { id: id, methods: {} };

                resource.methods[method] = methodJson;

                // call the original router with the original arguments

                var originalArgs = Array.prototype.slice.call(args, 0, handlersCount);
                originalMethodFunction.apply(self.connectRouter, originalArgs);
            };
        }(method, self.connectRouter[method]));
    }

    function getDescription(req, res) {
        var htmlTemplate;

        if (req.headers.accept &&
            (~req.headers.accept.indexOf('text/html') || ~req.headers.accept.indexOf('text/plain')))
        {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            if (!self.html) {
                try {
                    htmlTemplate = jade.compile(jadeTemplate);
                    self.html = htmlTemplate({restdoc: self.restdoc, baseUrl: self.baseUrl});
                } catch(e) {
                    console.error(e);
                }
            }
            return res.end(self.html);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(self.restdoc));
    }
};


exports.DocRouter = function (connectRouter, baseUrl, fn) {
    if (!connectRouter) throw new Error("connectRouter is missing");

    var docRouter = new DocRouter(connectRouter, baseUrl);

    if (fn) {
        fn(docRouter.connectRouter);
    }

    return docRouter.connectRouterReturn;
};

