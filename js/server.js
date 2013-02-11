"use strict";

var WebSocketServer =  require('websocket').server;
var http = require('http');
var clients = {};
var rooms = {123: {id: 123, name: "Test Room", capacity: 16, players: {}, player_count: 0}};
var uidCounter = 0;

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    return true;
    response.end();
});

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

var roomReplacer = function(key, value){
  if(key == "players"){
    return undefined;
  }
  return value;
}

function sendCallback(err) {
    if (err) console.error("send() error: " + err);
}

wsServer.on('request', function(request) {
    
    var con = request.accept('appstract', request.origin);

    console.log((new Date()) + ' Connection accepted.');
    var cID = uidCounter++;
    clients[cID] = {id: cID, connection: con};

    con.on('message', function(message) {
        if (message.type === 'utf8') {
           processMessageFromClient(con,message.utf8Data);
        }
        else if (message.type === 'binary') {
           console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
        }
    });

    function processMessageFromClient(connection,message) {
      
      var handled = false;

      var msg = JSON.parse(message);
      switch(msg.msg_type) {
        case "GAMEROOMS":
          console.log(msg.msg_type);

          console.log(rooms);

          var response = {}
          response.msg_type = "GAMEROOMS";
          response.data = {rooms: rooms};

          connection.send(JSON.stringify(response, roomReplacer));
          handled = true;
          break;
        case "JOINROOM":
          console.log(msg.msg_type);
          var roomID = msg.data.id;
          var room = rooms[roomID];
          room.players[cID] = clients[cID];
          room.player_count += 1;

          var response = {}
          response.msg_type = "ROOMJOINED";
          response.data = null;
          
          connection.send(JSON.stringify(response));
          handled = true;
          break;

        default:
          console.log('Not switched on ' + msg.msg_type);
      }      

      if (!handled){
        for(var otherCID in clients){ 
          if (otherCID != cID) {
            var client = clients[cID];
            client.connection.send(message.utf8Data, sendCallback);
          }
        }
      }

    }
   
    con.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + con.remoteAddress + ' disconnected.');

        delete clients[cID];

        for(var roomID in rooms)
        {
          var room = rooms[roomID];
          if(room.hasOwnProperty(cID))
          {
            room.player_count -= 1;
            delete room.players[cID];
          }
        }
    });
});
