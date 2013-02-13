function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
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
       socket.send(JSON.stringify(msgCANDIDATE));
    }
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

    dataChannel = pc.createDataChannel("sendDataChannel", 
                                         {reliable: false});

    dataChannel.onopen = onSendChannelStateChange;
    dataChannel.onclose = onSendChannelStateChange;
    dataChannel.onmessage = onReceiveMessageCallback;

    trace("createPeerConnection - Created webkitRTCPeerConnnection " + connectionId);
}

var onDataChannel = function(event) {
  dataChannel = event.channel;
};

var onNegotiationNeeded = function () {
  pc.createOffer(onOfferSuccess, onOfferFailure);
};

var onOfferSuccess = function(sessionDescription) {
  trace("onOfferSuccess creating offer");

  var onOfferSetLocalDescriptionSuccess = function() {
    trace("onOfferSuccess - Set the local description");

    var msgOFFER = {};
    msgOFFER.msg_type = 'OFFER';
    msgOFFER.data = pc.localDescription;
    
    // trace("onOfferSuccess - Sending session description : " + msgOFFER.data.sdp);
    // trace("onOfferSuccess - Sending sdp : " + sessionDescription.sdp);

    socket.send(JSON.stringify(msgOFFER));  
  }; 

  pc.setLocalDescription(sessionDescription, onOfferSetLocalDescriptionSuccess, onSetLocalDescriptionError);
}


var onOfferFailure = function(error) {
  trace("onOfferFailure failed to create offer: " + error);
}

var onAnswerSuccess = function(sessionDescription) {
  trace("onAnswerSuccess creating answer");

  var onAnswerSetLocalDescriptionSuccess = function() {
    trace("onAnswerSuccess - Set the local description");
  
    var msgANSWER = {};
    msgANSWER.msg_type = 'ANSWER';
    msgANSWER.data = pc.localDescription;
    
    socket.send(JSON.stringify(msgANSWER));
  }; 

  pc.setLocalDescription(sessionDescription, onAnswerSetLocalDescriptionSuccess, onSetLocalDescriptionError);
  
};

var onAnswerFailure = function(error) {
  trace("onAnswerFailure failed to create answer: " + error);
};

var onSetLocalDescriptionSuccess = function(){
  trace("onSetLocalDescriptionSuccess set the local description");
};

var onSetLocalDescriptionError = function(error) {
  trace("onSetRemoteDescriptionError failed to set the local description: " + error);
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

      switch (msg.msg_type) {
        case "GAMEROOMS":
          trace("GAMEROOMS request");

          var game_rooms_response = msg.data;
          var rooms = game_rooms_response.rooms;
          for(var room_index in rooms)
          {
            var room = rooms[room_index];
            $('#game_rooms tbody').append("<tr><td onclick='JoinRoom(" + room.id + ")'>" + room.name + "</td><td>" + room.player_count + " / " + room.capacity + "</td></tr>");
          }
          break;
        case "ROOMJOINED":
          trace("ROOMJOINED request");  
          createPeerConnection();
          break;

        case "OFFER":
          trace("OFFER - " + msg.data.sdp);

          //TODO: rs - not working correctly
          pc.setRemoteDescription(new RTCSessionDescription(msg.data), onSetRemoteDescriptionSuccess, onSetRemoteDescriptionError);
          pc.createAnswer(onAnswerSuccess, onAnswerFailure);
          
          break;
        case "CANDIDATE":
          trace("CANDIDATE - " + JSON.stringify(msg.candidate));

          var candidate = new RTCIceCandidate({candidate: msg.candidate});
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
}

openChannel();

var JoinRoom = function(roomID) {
  trace("JoinRoom start");
  var msgREQUEST = {};
  msgREQUEST.msg_type = 'JOINROOM';
  msgREQUEST.data = {id: roomID};

  socket.send(JSON.stringify(msgREQUEST));
}