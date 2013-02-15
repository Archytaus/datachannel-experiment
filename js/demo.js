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
var dataChannel;
var socket;
var pc;

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

       socket.send(JSON.stringify(msgCANDIDATE));
    }
};

var onDataChannel = function(event) {
  trace("onDataChannel - Data channel received");
  dataChannel = event.channel;

  dataChannel.onopen = onSendChannelStateChange;
  dataChannel.onclose = onSendChannelStateChange;
  dataChannel.onmessage = onReceiveMessageCallback;
};

var onNegotiationNeeded = function () {
  pc.createOffer(onOfferSuccess, onOfferFailure);
};

var onSetLocalDescriptionSuccess = function(){
  trace("onSetLocalDescriptionSuccess set the local description");
};

var onSetLocalDescriptionError = function(error) {
  trace("onSetRemoteDescriptionError failed to set the local description: " + error);
};

var onOfferSuccess = function(sessionDescription) {
  trace("onOfferSuccess creating offer");

  var onOfferSetLocalDescriptionSuccess = function() {
    trace("onOfferSuccess - Set the local description");

    var msgOFFER = {};
    msgOFFER.msg_type = 'OFFER';
    msgOFFER.data = pc.localDescription;

    socket.send(JSON.stringify(msgOFFER));  
  }; 

  pc.setLocalDescription(sessionDescription, onOfferSetLocalDescriptionSuccess, onSetLocalDescriptionError);
};

var onOfferFailure = function(error) {
  trace("onOfferFailure failed to create offer: " + error);
};

var onAnswerSuccess = function(sessionDescription) {
  trace("onAnswerSuccess creating answer");

  var onAnswerSetLocalDescriptionSuccess = function() {
    trace("onAnswerSuccess - Set the local description");
    
    if (pc.remoteDescription.type === 'offer') {
      trace("onAnswerSuccess - Sending answer")
      var msgANSWER = {};
      msgANSWER.msg_type = 'ANSWER';
      msgANSWER.data = pc.localDescription;
    
      socket.send(JSON.stringify(msgANSWER));  
    }
    else {
      trace("onAnswerSuccess - No answer required")
    }
  }; 

  pc.setLocalDescription(sessionDescription, onAnswerSetLocalDescriptionSuccess, onSetLocalDescriptionError);
  
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
  trace('Received Message ' + JSON.stringify(event));
}

function onSendChannelStateChange() {
  var readyState = dataChannel.readyState;
  trace('Send channel state is: ' + readyState);
}

// Create the peer connection (via the node server)
var createPeerConnection = function(connectionId, initiatorFlag) {

  var pc_config = {"iceServers": [{"url": stunServer}]};
  // var pc_config = null;

  pc = new RTCPeerConnection(pc_config, {
    optional: [{
      RtpDataChannels: true
    }]}
  );

  pc.onicecandidate = onIceCandidate;
  pc.onconnecting   = onSessionConnecting;
  pc.onopen         = onSessionOpened;
  pc.onnegotiationneeded = onNegotiationNeeded;
  pc.ondatachannel = onDataChannel;

  trace("createPeerConnection - Created webkitRTCPeerConnnection " + connectionId);
}

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
      trace(msg.msg_type + " - " + JSON.stringify(msg.data);

      switch (msg.msg_type) {
        case "GAMEROOMS":
          var game_rooms_response = msg.data;
          var rooms = game_rooms_response.rooms;
          for(var room_index in rooms)
          {
            var room = rooms[room_index];
            $('#game_rooms tbody').append("<tr><td onclick='JoinRoom(" + room.id + ")'>" + room.name + "</td><td>" + room.player_count + " / " + room.capacity + "</td></tr>");
          }
          break;

        case "ROOMJOINED":
          var peers = msg.peers;

          createPeerConnection();

          if(peers.length > 0) {
            trace("Creating data channel");
            // TOOD: RS - NEED TO CREATE A PEER CONNECTION AND DATACHANNEL FOR EVERY PEER THAT JOINS
            // Should only be creating on of these for the offering party...
            dataChannel = pc.createDataChannel("sendDataChannel", 
                                                 {reliable: false});
            
            var dataChannelOpened = function(){
              trace("Data channel opened");

              dataChannel.send({data: "Hello world!"});
            };

            dataChannel.onopen = dataChannelOpened;
            dataChannel.onclose = onSendChannelStateChange;
            dataChannel.onmessage = onReceiveMessageCallback;
          }

          break;

        case "OFFER":
          var onSetOfferRemoteSuccess = function(){
            trace("onSetOfferRemoteSuccess set the remote description");
            
            pc.createAnswer(onAnswerSuccess, onAnswerFailure);
          };

          var remoteDescription = new RTCSessionDescription(msg.data);
          pc.setRemoteDescription(remoteDescription, onSetOfferRemoteSuccess, onSetRemoteDescriptionError);
          
          break;

        case "ANSWER":
          var remoteDescription = new RTCSessionDescription(msg.data);
          pc.setRemoteDescription(remoteDescription, onSetRemoteDescriptionSuccess, onSetRemoteDescriptionError);
          break;

        case "CANDIDATE":
          var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate: msg.candidate});
          pc.addIceCandidate(candidate);
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
  var msgREQUEST = {};
  msgREQUEST.msg_type = 'JOINROOM';
  msgREQUEST.data = {id: roomID};

  socket.send(JSON.stringify(msgREQUEST));
};