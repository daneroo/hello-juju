var config = require('./config/config'),
    mongo = require('mongodb'),
    http = require('http');

// var mime = 'application/json';
var mime = 'text/plain';

function getIP(argument) {
  var firstIP = null;
  var os = require('os');
  var ifaces = os.networkInterfaces();
  for(var dev in ifaces) {
    var alias = 0;
    ifaces[dev].forEach(function(details) {
      if(details.family == 'IPv4') {
        if (!firstIP && !details.internal){
          firstIP=details.address;
        }
        console.log(dev + (alias ? ':' + alias : ''), details);

        ++alias;
      }
    });
  }
  console.log("I will identify myself as",firstIP);
  return firstIP;
}

var selfIP = getIP();

var show_log = function(request, response, db){
  db.collection('addresses', function(err, collection){
    collection.find({}, {limit:10, sort:[['_id','desc']]}, function(err, cursor){
      cursor.toArray(function(err, items){
        response.writeHead(200, {'Content-Type': mime});
        response.write(JSON.stringify(items,null,2));
        response.end();
      });
    });
  });
}

var track_hit = function(request, response, db){
  db.collection('addresses', function(err, collection){
    var address = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    hit_record = {
      'node': selfIP,
      'server': request.headers['host'],
      'forwarded': request.headers['x-forwarded-for']||null,
      'remote': request.connection.remoteAddress,
      'client': address,
      'ts': new Date()
    };
    collection.insert( hit_record, {safe:true}, function(err){
      if(err) { 
        console.log(err.stack);
      }
      response.writeHead(200, {'Content-Type': mime});
      response.write(JSON.stringify(hit_record,null,2));
      response.end();
    });
  });
}

var server = new mongo.Server(config.mongo_host, config.mongo_port, {auto_reconnect: true});
var replSet = null;
if(config.mongo_replset) {
  replSet = new mongo.ReplSetServers([server], {
    rs_name: config.mongo_replset
  });
}


var db = new mongo.Db('jujuone', replSet||server,{safe:true});
db.open(function(err, db){
  if(err){
        console.log(err.stack);    
  }
  var server = http.createServer(function (request, response) {

    var url = require('url').parse(request.url);

    if(url.pathname === '/hits') {
      show_log(request, response, db);
    } else {
      track_hit(request, response, db);
    }

  });
  server.listen(config.listen_port);
});

console.log("Server running at http://0.0.0.0:" + config.listen_port + "/");
