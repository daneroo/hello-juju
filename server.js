var config = require('./config/config')
var http = require('http');

http.createServer(function(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.end('Hello from Juju\n'+JSON.stringify(config,null,2));
}).listen(config.listen_port);

console.log("Server running at http://0.0.0.0:" + config.listen_port + "/");
