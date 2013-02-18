var networkModule = (function () {
  "use strict";

  function CreateConnection(){

    this.nodeHostAddress  = "127.0.0.1";
    this.nodeHostPort     = "8080";
    this.stunServer       = "stun:stun.l.google.com:19302";
    this.peers = [];

    this.host_id = undefined;
    this.id = undefined;
    this.room_id = undefined;
    this.socket = undefined;

    this.findPeer = function(id){
      for(var peerIndex in this.peers) {
        var peer = this.peers[peerIndex];
        if(peer.id == id){
          return peer;
        }
      }
      return undefined;
    };

    this.isHost = function(){
      return this.host_id === this.id;
    };
    
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

    this.connectToPeer = function(peerID) {
      var self = this;
      var pc_config = {"iceServers": [{"url": this.stunServer}]};
      
      var pc = new RTCPeerConnection(pc_config, {
        optional: [{
          RtpDataChannels: true
        }]}
      );
      var peer = {id: peerID, connection: pc, dataChannel: undefined };

      // This function sends candidates to the remote peer, via the node server
      var onIceCandidate = function(event) {
          if (event.candidate) {
             trace("openChannel - Sending ICE candidate to remote peer : " + event.candidate.candidate);
             
             var msgCANDIDATE = {
               msg_type: 'CANDIDATE',
               candidate: event.candidate.candidate,
               id: event.candidate.sdpMid,
               label: event.candidate.sdpMLineIndex,
               peer_id: self.id,
               dest_id: peerID,
             };
             self.socket.send(JSON.stringify(msgCANDIDATE));
          }
      };

      var onReceiveMessageCallback = function(event) {        
        self.onPeerMessage(JSON.parse(event.data));
      };

      var onOfferSuccess = function(sessionDescription) {
        trace("onOfferSuccess creating offer");

        var onOfferSetLocalDescriptionSuccess = function() {
          trace("onOfferSuccess - Set the local description");

          var msgOFFER = {
            msg_type: 'OFFER',
            data: sessionDescription,
            peer_id: self.id,
            dest_id: peerID,
          };
          self.socket.send(JSON.stringify(msgOFFER));  
        };

        pc.setLocalDescription(sessionDescription, onOfferSetLocalDescriptionSuccess, onSetLocalDescriptionError);
      };

      var onNegotiationNeeded = function () {
        pc.createOffer(onOfferSuccess, onOfferFailure);
      };

      var onDataChannel = function(event) {
        trace("onDataChannel - Data channel received");
        var dataChannel = event.channel;

        var onChannelOpen = function(){
          if(self.onPeerConnected){
            self.onPeerConnected(peer);
          }
        };

        var onSendChannelStateChange = function(){
          var readyState = dataChannel.readyState;
          trace('Send channel state is: ' + readyState);
        }

        dataChannel.onopen = onChannelOpen;
        dataChannel.onclose = onSendChannelStateChange;
        dataChannel.onmessage = onReceiveMessageCallback;
        peer.dataChannel = dataChannel;
      };

      pc.onicecandidate = onIceCandidate;
      pc.onconnecting   = onSessionConnecting;
      pc.onopen         = onSessionOpened;
      pc.onnegotiationneeded = onNegotiationNeeded;
      pc.ondatachannel = onDataChannel;

      trace("createPeerConnection - Created webkitRTCPeerConnnection " + peerID);

      return peer;
    };

    this.handleServerMessage = function(msg){
      switch (msg.msg_type) {
          case "HANDSHAKE":
            this.id = msg.data.id;

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

          case "ROOMINFO":
            this.host_id = msg.data.host_id;
            break;

          case "PEERCONNECTED":
            var peer = this.connectToPeer(msg.peer_id);
            
            this.peers.push(peer);

            trace("Creating data channel for " + peer.id);

            // Should only be creating on of these for the offering party...
            peer.dataChannel = peer.connection.createDataChannel("sendDataChannel", 
                                                 {reliable: false});
            var self = this;
            var dataChannelOpened = function(){
              trace("Data channel opened");

              self.sendPeers({data: "Hello World!"});
            };
            
            var onChannelOpen = function(){
              if(self.onPeerConnected){
                self.onPeerConnected(peer);
              }
            };

            var onSendChannelStateChange = function(){
              var readyState = dataChannel.readyState;
              trace('Send channel state is: ' + readyState);
            };

            var onReceiveMessageCallback = function(event) {        
              self.onPeerMessage(JSON.parse(event.data));
            };

            peer.dataChannel.onopen = onChannelOpen;
            peer.dataChannel.onclose = onSendChannelStateChange;
            peer.dataChannel.onmessage = onReceiveMessageCallback;

            break;

          case "OFFER":
            var peer = this.connectToPeer(msg.peer_id);
            this.peers.push(peer);
            
            var self = this;

            var onAnswerSuccess = function(sessionDescription) {
              trace("onAnswerSuccess creating answer");
              
              var onAnswerSetLocalDescriptionSuccess = function() {
                trace("onAnswerSuccess - Set the local description");
                
                var msgANSWER = {
                  msg_type: 'ANSWER',
                  data: peer.connection.localDescription,
                  peer_id: self.id,
                  dest_id: msg.peer_id,
                };
                self.socket.send(JSON.stringify(msgANSWER));  
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
            var peer = this.findPeer(msg.peer_id);
            peer.connection.setRemoteDescription(remoteDescription, onSetRemoteDescriptionSuccess, onSetRemoteDescriptionError);
            break;

          case "CANDIDATE":
            var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate: msg.candidate});
            var peer = this.findPeer(msg.peer_id);
            peer.connection.addIceCandidate(candidate);
            break;

          default:
            // Unexpected, but reserved for other message types
            trace("openChannel unknown message " + msg.msg_type);
        }
    };

    this.connectToServer = function(address, port){
      this.nodeHostAddress = address;
      this.nodeHostPort = port;
      var self = this;

      trace("openChannel Opening channel");

      // Construction of the websocket together with the application
      this.socket = new WebSocket('ws://' + this.nodeHostAddress + ':' + this.nodeHostPort, 'appstract');

      this.socket.onopen = function () {
        trace("openChannel Channel opened.");
        
        requestGameRooms();
      };

      this.socket.onerror = function (error) {
         trace("openChannel - Channel error:" + error);
      };

      this.socket.onclose = function () {
         trace("openChannel - Channel close.");
      };

      // Log messages from the server
      this.socket.onmessage = function (e) {
        
        var msg = JSON.parse(e.data);
        trace(msg.msg_type + " - " + JSON.stringify(msg.data));
        
        self.handleServerMessage(msg);
      };
    };

    this.sendServer = function(msg){
      this.socket.send(JSON.stringify(msg));
    };

    this.sendPeers = function(msg){
      var msg_to_send = JSON.stringify(msg);

      for(var peerIndex in this.peers) {
        var peer = this.peers[peerIndex];
        if(peer.dataChannel && peer.dataChannel.readyState == "open"){
          peer.dataChannel.send(msg_to_send);
        }
      }
    };

    this.sendPeer = function(peerId, msg){
      var peer = this.findPeer(peerId);
      if(peer.dataChannel && peer.dataChannel.readyState == "open"){
        peer.dataChannel.send(JSON.stringify(msg));  
      }
    };

    this.onPeerMessage = function(msg){
      trace('Received Message ' + JSON.stringify(msg));
    };

    this.onPeerConnected = function(peer){
      trace('Peer' + peer.id + ' connected');
    };
  }

  return {
    connect: function(){return new CreateConnection}
  }

}());