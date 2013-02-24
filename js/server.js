"use strict";

var WebSocketServer =  require('websocket').server;
var http = require('http');
var clients = [];
var rooms = {123: {id: 123, name: "Test Room", capacity: 16, players: [], player_count: 0}};
var uidCounter = 0;

Array.prototype.remove = function(from, to){
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

function findClientByID(id) {
  for (var i = 0; i < clients.length; i++) {
    var client = clients[i];
    if(client.id == id)
      return client;
  }

  return undefined;
}

function findClientInRoom(id, roomID){
  var room = rooms[roomID];
  for (var i = 0; i < room.players.length; i++) {
    var client = room.players[i];
    if(client.id == id)
      return client;
  }

  return undefined;
}

function sendMessageToClient(id, msg){
  var client = findClientByID(id);
  if(client != undefined){
    client.connection.send(msg);
  }
}

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
};

function sendCallback(err) {
    if (err) console.error("send() error: " + err);
}

wsServer.on('request', function(request) {
    
    var con = request.accept('appstract', request.origin);

    console.log((new Date()) + ' Connection accepted.');
    var cID = uidCounter++;
    var client = {id: cID, connection: con};
    clients.push(client);

    con.on('message', function(message) {
        if (message.type === 'utf8') {
           processMessageFromClient(con,message.utf8Data);
        }
        else if (message.type === 'binary') {
           console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
        }
    });
    
    var msg_handshake = {};
    msg_handshake.msg_type = "HANDSHAKE";
    msg_handshake.data = {id: cID};

    con.send(JSON.stringify(msg_handshake));

    function passMessageToOtherClients(msg) {
      try
      {
        for (var i = 0; i < clients.length; i++) {
          var otherClient = clients[i];
          if (otherClient.id != cID) {
            otherClient.connection.send(msg, sendCallback);
          }
        }
      }
      catch(e)
      {
        console.log("Failed to send message: (" + e + ") - " + msg);
      }
    }

    function passMessageToOtherClientsInRoom(roomID, msg) {
      try
      {
        var room = rooms[roomID];

        for (var i = 0; i < room.players.length; i++) {
          var otherClient = room.players[i];
          if (otherClient.id != cID) {
            otherClient.connection.send(msg, sendCallback);
          }
        }
      }
      catch(e)
      {
        console.log("Failed to send message: (" + e + ") - " + msg);
      }
    }

    function processMessageFromClient(connection,message) {
      
      var handled = false;
      
      var msg = JSON.parse(message);
      console.log("Connection " + cID + " received " + msg.msg_type);

      switch(msg.msg_type) {
        case "GAMEROOMS":
          var gameRoomsMSG = {};
          gameRoomsMSG.msg_type = "GAMEROOMS";
          gameRoomsMSG.data = {rooms: rooms};

          connection.send(JSON.stringify(gameRoomsMSG, roomReplacer));
          handled = true;
          break;
          
        case "JOINROOM":
          var roomID = msg.data.id;
          var room = rooms[roomID];
          
          if(room.host_id == undefined){
            console.log("New host: " + cID);
            room.host_id = cID;
          }

          var msgNewPeer = {
            msg_type: "PEERCONNECTED",
            peer_id: cID,
          };
          passMessageToOtherClientsInRoom(roomID, JSON.stringify(msgNewPeer));

          var msgRoomInfo = {
            msg_type: "ROOMINFO",
            data: {host_id: room.host_id}
          };
          sendMessageToClient(cID, JSON.stringify(msgRoomInfo));
          console.log("New client: " + JSON.stringify(Object.keys(client)));

          room.players.push(client);
          room.player_count += 1;

          handled = true;
          break;
        case "OFFER":
          sendMessageToClient(msg.dest_id, JSON.stringify(msg));
          
          handled = true;
          break;
        case "CANDIDATE":
          sendMessageToClient(msg.dest_id, JSON.stringify(msg));

          handled = true;
          break;
        case "ANSWER":
          sendMessageToClient(msg.dest_id, JSON.stringify(msg));
          
          handled = true;
          break;
        default:
          console.log('Not switched on ' + msg.msg_type);
      }      

      if (!handled){
        passMessageToOtherClients(JSON.stringify(msg));
      }
    }
    
    con.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + cID + " (" + con.remoteAddress + ') disconnected.');

        clients.remove(clients.indexOf(client));

        for(var roomID in rooms)
        {
          var room = rooms[roomID];
          var playerIndex = room.players.indexOf(client);
          if(playerIndex != -1)
          {
            room.player_count -= 1;
            room.players.remove(playerIndex);

            if(cID == room.host_id){
              
              // Create a new host id
              room.host_id = undefined;

              if(room.player_count > 0){
                room.host_id = room.players[0].id;
              }
            }
          }
        }
    });
});
