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
var localStream;
var socket;

// This function sends candidates to the remote peer, via the node server
var onIceCandidate = function(event) {

    if (event.candidate) {

       trace("openChannel Sending ICE candidate to remote peer : " + event.candidate.candidate);
       var msgCANDIDATE = {};
       msgCANDIDATE.msg_type  = 'CANDIDATE';
       msgCANDIDATE.candidate = event.candidate.candidate;
       socket.send(JSON.stringify(msgCANDIDATE));

    } else {
       trace("onIceCandidate End of candidates");
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

    // The following is for the SERVER side
    pc.onaddstream = function(event) {
       trace("createPeerConnection Remote stream added.");
       var url = webkitURL.createObjectURL(event.stream);
       trace("createPeerConnection url = " + url);
       remoteStream = event.stream;
       $("#remote-video").attr("src",url);
    };

    localStream = pc.createDataChannel("sendDataChannel", 
                                         {reliable: false});

    pc.onremovestream = onRemoteStreamRemoved;

    trace("createPeerConnection Created webkitRTCPeerConnnection " + connectionId);
}

var onSessionConnecting = function(message) {
    trace("onSessionConnecting Session connecting");
}

var onSessionOpened = function(message) {
    trace("onSessionOpened Session opened");
}

var onRemoteStreamRemoved = function(event) {
    trace("onRemoteStreamRemoved","Remote stream removed");
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
       trace("openChannel",'Channel error.', error);
    };

    socket.onclose = function () {
       trace("openChannel",'Channel close.');
       
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
            $('#game_rooms').append("<li onclick='JoinRoom(" + room.id + ")'>" + room.name + "</li>");
          }
          break;
        case "ROOMJOINED":
          trace("ROOMJOINED request");  
        
        // Unexpected, but reserved for other message types
        default:
           trace("openChannel default");
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