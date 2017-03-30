module.exports = {
    adapt: function() {
        var url = require('url');
        var http = require('http');

        global.window = {};

        window.setTimeout = setTimeout;
        window.clearTimeout = clearTimeout;

        window.console = console;
        window.console.debug = window.console.log;

        // Fields shared by all XMLHttpRequest instances.
        var _agent = new http.Agent({
            keepAlive: true
        });
        var _cookies = [];

        // Bare minimum XMLHttpRequest implementation that works with CometD.
        window.XMLHttpRequest = function() {
            var _config;
            var _request;

            this.status = 0;
            this.statusText = '';
            this.readyState = window.XMLHttpRequest.UNSENT;
            this.responseText = '';

            this.open = function(method, uri) {
                _config = url.parse(uri);
                _config.method = method;
                _config.agent = _agent;
                _config.headers = {};
                this.readyState = window.XMLHttpRequest.OPENED;
            };

            this.setRequestHeader = function(name, value) {
                _config.headers[name] = value;
            };

            this.send = function(data) {
                var self = this;
                for (var i = 0; i < _cookies.length; ++i) {
                    _config.headers['Cookie'] = _cookies[i];
                }
                _request = http.request(_config, function(response) {
                    var success = false;
                    self.status = response.statusCode;
                    self.statusText = response.statusMessage;
                    self.readyState = window.XMLHttpRequest.HEADERS_RECEIVED;
                    var headers = response.headers;
                    for (var name in headers) {
                        if (/^set-cookie$/i.test(name)) {
                            var header = headers[name];
                            for (var i = 0; i < header.length; ++i) {
                                var whole = header[i];
                                var parts = whole.split(';');
                                var cookie = parts[0];
                                _cookies.push(cookie);
                            }
                        }
                    }
                    response.on('data', function(chunk) {
                        self.readyState = window.XMLHttpRequest.LOADING;
                        self.responseText += chunk;
                    });
                    response.on('end', function() {
                        success = true;
                        self.readyState = window.XMLHttpRequest.DONE;
                        if (self.onload) {
                            self.onload();
                        }
                    });
                    response.on('close', function() {
                        if (!success) {
                            self.readyState = window.XMLHttpRequest.DONE;
                            if (self.onerror) {
                                self.onerror();
                            }
                        }
                    });
                });
                _request.on('abort', function() {
                    self.readyState = window.XMLHttpRequest.DONE;
                    if (self.onerror) {
                        self.onerror();
                    }
                });
                _request.on('aborted', function() {
                    self.readyState = window.XMLHttpRequest.DONE;
                    if (self.onerror) {
                        self.onerror();
                    }
                });
                if (data) {
                    _request.write(data);
                }
                _request.end();
            };

            this.abort = function() {
                if (_request) {
                    _request.abort();
                }
            };
        };
        window.XMLHttpRequest.UNSENT = 0;
        window.XMLHttpRequest.OPENED = 1;
        window.XMLHttpRequest.HEADERS_RECEIVED = 2;
        window.XMLHttpRequest.LOADING = 3;
        window.XMLHttpRequest.DONE = 4;
    }
};
