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
    this.server_connected = false;

    var serverMessageCallback = {};
    var serverOnConnectionCallback = [];

    var peerMessageCallback = {};

    this.findPeer = function(id){

      for (var i = 0; i < this.peers.length; i++) {
        var peer = this.peers[i];
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

    this.onReceiveMessageCallback = function(event) {
      var msg = JSON.parse(event.data);

      if(peerMessageCallback.hasOwnProperty(msg.msg_type)){
        for (var i = peerMessageCallback[msg.msg_type].length - 1; i >= 0; i--) {
          peerMessageCallback[msg.msg_type][i].call(this, msg);
        }
      }
    };

    this.onChannelOpen = function(event, peer) {
      if(this.onPeerConnected){
        this.onPeerConnected(peer);
      }
    };

    this.onChannelClosed = function(event, peer) {
      if(this.onPeerDisconnected){
        this.onPeerDisconnected(peer);
      }
    };

    this.prepareDataChannel = function(dataChannel, peer) {
      var self = this;
      dataChannel.onopen = function(event) { self.onChannelOpen(event, peer); };
      dataChannel.onclose = function(event) { self.onChannelClosed(event, peer); };
      dataChannel.onmessage = this.onReceiveMessageCallback;

      peer.dataChannel = dataChannel;
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

        self.prepareDataChannel(dataChannel, peer);
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
            
          case "ROOMINFO":
            this.host_id = msg.data.host_id;
            break;

          case "PEERCONNECTED":
            var peer = this.connectToPeer(msg.peer_id);
            
            this.peers.push(peer);

            trace("Creating data channel for " + peer.id);

            var dataChannel = peer.connection.createDataChannel("sendDataChannel", 
                                                 {reliable: false});

            this.prepareDataChannel(dataChannel, peer);

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

        if(serverMessageCallback.hasOwnProperty(msg.msg_type)){
          for (var i = serverMessageCallback[msg.msg_type].length - 1; i >= 0; i--) {
            serverMessageCallback[msg.msg_type][i].call(this, msg);
          }
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
        self.server_connected = true;

        for (var i = serverOnConnectionCallback.length - 1; i >= 0; i--) {
          serverOnConnectionCallback[i].call(this);
        }
      };

      this.socket.onerror = function (error) {
        self.server_connected = false;

        trace("openChannel - Channel error:" + error);
      };

      this.socket.onclose = function () {
        self.server_connected = false;

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

      for (var i = 0; i < this.peers.length; i++) {
        var peer = this.peers[i];
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

    this.onPeerMessage = function(msg_type, callback){
      if(!peerMessageCallback.hasOwnProperty(msg_type)){
        peerMessageCallback[msg_type] = [];
      }
      peerMessageCallback[msg_type].push(callback);
    };

    this.onPeerConnected = function(peer){
      trace('Peer' + peer.id + ' connected');
    };

    this.onPeerDisconnected = function(peer){
      trace('Peer' + peer.id + ' disconnected');
    };

    this.runWhenServerConnected = function(callback){
      if(this.server_connected){
        callback();
      }

      serverOnConnectionCallback.push(callback);
    };

    this.onServerMessage = function(msg_type, callback){
      if(!serverMessageCallback.hasOwnProperty(msg_type)){
        serverMessageCallback[msg_type] = [];
      }
      serverMessageCallback[msg_type].push(callback);
    };
  }

  return {
    connect: function(){return new CreateConnection}
  }

}());