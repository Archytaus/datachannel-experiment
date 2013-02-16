'use strict';

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

var RTCPeerConnection = webkitRTCPeerConnection || mozRTCPeerConnection;

var nodeHostAddress  = "127.0.0.1";
var nodeHostPort     = "8080";

var stunServer       = "stun:stun.l.google.com:19302";
var channelReady     = false;
var socket;
var peers = [];
var my_id = 0;
var my_room_id = 0;

var onSetLocalDescriptionSuccess = function(){
  trace("onSetLocalDescriptionSuccess set the local description");
};

var onSetLocalDescriptionError = function(error) {
  trace("onSetRemoteDescriptionError failed to set the local description: " + error);
};

var onOfferFailure = function(error) {
  trace("onOfferFailure failed to create offer: " + error);
};

var onAnswerFailure = function(error) {
  trace("onAnswerFailure failed to create answer: " + error);
};

var onSetRemoteDescriptionSuccess = function(){
  trace("onSetRemoteDescriptionSuccess set the remote description");
};

var onSetRemoteDescriptionError = function(error) {
  trace("onSetRemoteDescriptionError failed to set the remote description: " + error);
};

var onSessionConnecting = function(message) {
  trace("onSessionConnecting Session connecting");
};

var onSessionOpened = function(message) {
  trace("onSessionOpened Session opened");
};

function onReceiveMessageCallback(event) {
  trace('Received Message ' + JSON.stringify(event.data));
}

function findPeerByID(id){
  for(var peerIndex in peers) {
    var peer = peers[peerIndex];
    if(peer.id == id)
      return peer;
  }

  return undefined;
}

// Create the peer connection (via the node server)
var createPeerConnection = function(newPeerId) {
  
  var pc_config = {"iceServers": [{"url": stunServer}]};
  // var pc_config = null;

  var pc = new RTCPeerConnection(pc_config, {
    optional: [{
      RtpDataChannels: true
    }]}
  );
  var peer = {id: newPeerId, connection: pc, dataChannel: undefined };

  // This function sends candidates to the remote peer, via the node server
  var onIceCandidate = function(event) {
      if (event.candidate) {
         trace("openChannel - Sending ICE candidate to remote peer : " + event.candidate.candidate);
         
         //TODO: rs - find a way to send the room number so that it is only shared with others in the same room
         var msgCANDIDATE = {};
         msgCANDIDATE.msg_type  = 'CANDIDATE';
         msgCANDIDATE.candidate = event.candidate.candidate;
         msgCANDIDATE.id = event.candidate.sdpMid;
         msgCANDIDATE.label = event.candidate.sdpMLineIndex;
         msgCANDIDATE.peer_id = my_id;
         msgCANDIDATE.dest_id = newPeerId;

         socket.send(JSON.stringify(msgCANDIDATE));
      }
  };

  var onOfferSuccess = function(sessionDescription) {
    trace("onOfferSuccess creating offer");

    var onOfferSetLocalDescriptionSuccess = function() {
      trace("onOfferSuccess - Set the local description");

      var msgOFFER = {};
      msgOFFER.msg_type = 'OFFER';
      msgOFFER.data = sessionDescription;
      msgOFFER.peer_id = my_id;
      msgOFFER.dest_id = newPeerId;

      socket.send(JSON.stringify(msgOFFER));  
    };

    pc.setLocalDescription(sessionDescription, onOfferSetLocalDescriptionSuccess, onSetLocalDescriptionError);
  };

  var onNegotiationNeeded = function () {
    pc.createOffer(onOfferSuccess, onOfferFailure);
  };

  var onDataChannel = function(event) {
    trace("onDataChannel - Data channel received");
    var dataChannel = event.channel;

    var onSendChannelStateChange = function(){
      var readyState = dataChannel.readyState;
      trace('Send channel state is: ' + readyState);
    }

    dataChannel.onopen = onSendChannelStateChange;
    dataChannel.onclose = onSendChannelStateChange;
    dataChannel.onmessage = onReceiveMessageCallback;
    peer.dataChannel = dataChannel;
  };

  pc.onicecandidate = onIceCandidate;
  pc.onconnecting   = onSessionConnecting;
  pc.onopen         = onSessionOpened;
  pc.onnegotiationneeded = onNegotiationNeeded;
  pc.ondatachannel = onDataChannel;

  trace("createPeerConnection - Created webkitRTCPeerConnnection " + newPeerId);

  return peer;
};

// Open a channel towards the Node server
var openChannel = function () {

    trace("openChannel Opening channel");

    // Construction of the websocket together with the application
    socket = new WebSocket('ws://' + nodeHostAddress + ':' + nodeHostPort, 'appstract');

    socket.onopen = function () {
      trace("openChannel Channel opened.");
      
      requestGameRooms();
    };

    socket.onerror = function (error) {
       trace("openChannel - Channel error:" + error);
    };

    socket.onclose = function () {
       trace("openChannel - Channel close.");
       
       channelReady = false;
    };

    // Log messages from the server
    socket.onmessage = function (e) {
      var msg = JSON.parse(e.data);
      trace("openChannel Received message type : " + msg.msg_type);
      trace(msg.msg_type + " - " + JSON.stringify(msg.data));

      switch (msg.msg_type) {
        case "HANDSHAKE":
          my_id = msg.data.id;

          break;
        case "GAMEROOMS":
          var game_rooms_response = msg.data;
          var rooms = game_rooms_response.rooms;
          for(var room_index in rooms)
          {
            var room = rooms[room_index];
            $('#game_rooms tbody').append("<tr><td onclick='JoinRoom(" + room.id + ")'>" + room.name + "</td><td>" + room.player_count + " / " + room.capacity + "</td></tr>");
          }
          break;

        case "PEERCONNECTED":
          var peer = createPeerConnection(msg.peer_id);
          
          peers.push(peer);

          trace("Creating data channel for " + peer.id);

          // Should only be creating on of these for the offering party...
          peer.dataChannel = peer.connection.createDataChannel("sendDataChannel", 
                                               {reliable: false});
          
          var dataChannelOpened = function(){
            trace("Data channel opened");

            peer.dataChannel.send({data: "Hello world!"});
          };
          
          var onSendChannelStateChange = function(){
            var readyState = dataChannel.readyState;
            trace('Send channel state is: ' + readyState);
          };

          peer.dataChannel.onopen = dataChannelOpened;
          peer.dataChannel.onclose = onSendChannelStateChange;
          peer.dataChannel.onmessage = onReceiveMessageCallback;

          break;

        case "OFFER":
          var peer = createPeerConnection(msg.peer_id);
          peers.push(peer);
          
          var onAnswerSuccess = function(sessionDescription) {
            trace("onAnswerSuccess creating answer");

            var onAnswerSetLocalDescriptionSuccess = function() {
              trace("onAnswerSuccess - Set the local description");
              
              var msgANSWER = {};
              msgANSWER.msg_type = 'ANSWER';
              msgANSWER.data = peer.connection.localDescription;
              msgANSWER.peer_id = my_id;
              msgANSWER.dest_id = msg.peer_id;
              
              socket.send(JSON.stringify(msgANSWER));  
            }; 

            peer.connection.setLocalDescription(sessionDescription, onAnswerSetLocalDescriptionSuccess, onSetLocalDescriptionError);
          };

          var onSetOfferRemoteSuccess = function(){
            trace("onSetOfferRemoteSuccess set the remote description");

            peer.connection.createAnswer(onAnswerSuccess, onAnswerFailure);
          };

          var remoteDescription = new RTCSessionDescription(msg.data);
          peer.connection.setRemoteDescription(remoteDescription, onSetOfferRemoteSuccess, onSetRemoteDescriptionError);
          
          break;

        case "ANSWER":
          var remoteDescription = new RTCSessionDescription(msg.data);
          var peer = findPeerByID(msg.peer_id);
          peer.connection.setRemoteDescription(remoteDescription, onSetRemoteDescriptionSuccess, onSetRemoteDescriptionError);
          break;

        case "CANDIDATE":
          var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate: msg.candidate});
          var peer = findPeerByID(msg.peer_id);
          peer.connection.addIceCandidate(candidate);
          break;

        default:
          // Unexpected, but reserved for other message types
          trace("openChannel unknown message " + msg.msg_type);
      }

    };
}

var requestGameRooms = function() {
  trace("requestGameRooms start");
  var msgREQUEST = {};
  msgREQUEST.msg_type = 'GAMEROOMS';
  msgREQUEST.data = {};

  socket.send(JSON.stringify(msgREQUEST));
};

openChannel();

var JoinRoom = function(roomID) {
  trace("JoinRoom start");

  my_room_id = roomID;

  var msgREQUEST = {};
  msgREQUEST.msg_type = 'JOINROOM';
  msgREQUEST.data = {id: roomID};

  socket.send(JSON.stringify(msgREQUEST));
};