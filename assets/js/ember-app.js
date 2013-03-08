//TODO: RS - Move these functions / declarations into appropriate files
Space = Ember.Application.create({
  ready: function(){
    Space.network = networkModule.connect();

    Space.network.connectToServer("127.0.0.1", "8080");
  }
});

Space.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
Space.ApplicationController = Ember.Controller.extend();

Space.LoginView = Ember.View.extend({
  templateName: 'login',
  player_name: '',
  submit: function(){
    Space.PlayerName = this.player_name;
    this.get('controller').transitionToRoute('rooms');
  },
  didInsertElement: function() {
    $('header h1.heading').css("font-size","66px");
  }
});

Space.Router.map(function(){
  this.route("login");
  this.route("rooms");
  this.route("game");
});

Space.IndexRoute = Ember.Route.extend({
  redirect: function () {
    this.transitionTo('login');
  }
});

Space.RoomsRoute = Ember.Route.extend({
  setupController: function(controller) {
    controller.set('content', []);
  },
  redirect: function() {
    if(Space.PlayerName === undefined){
      this.transitionTo('login');
    }
  }
});

Space.GameRoute = Ember.Route.extend({
  setupController: function(controller) {
    controller.set('content', [{sender: "System", content: "Hello World", timestamp: "10-10-2013"}]);
  },
  redirect: function () {
    if(Space.Scene === undefined){
      this.transitionTo('rooms');
    }
  }
});

Space.Room = Ember.Object.extend({
  id: 0,
  name: null,
  player_count: 0,
  capacity: 0
});

Space.RoomsController = Ember.ArrayController.extend({
  joinRoom: function(room){
    console.log("Joining room: " + room.id);

    Space.JoinRoom(room.id);
    this.transitionToRoute('game');
  },
  addRoom: function(room){
    var newRoom = Space.Room.create(room);
    this.pushObject(newRoom);
  },
  init: function() {
    this._super();
    Space.network.runWhenServerConnected(function(){
      Space.network.sendServer({
        msg_type: 'GAMEROOMS'
      });
    });

    var self = this;
    Space.network.onServerMessage('GAMEROOMS', function(msg){
      var game_rooms_response = msg.data;
      var rooms = game_rooms_response.rooms;
      
      for(var room_index in rooms) {
        self.addRoom(rooms[room_index]);
      }
    });
  }
});

Space.RoomsView = Ember.View.extend({
  templateName: 'rooms',

  didInsertElement: function() {
    $('header h1.heading').css("font-size","24px");
  }
});

Space.PlayerInfo = Ember.Object.create({
  speed: 0,
  max_speed: 50,
});

Space.GameController = Ember.ArrayController.extend({
  addMessage: function(message){
    this.pushObject(message);
  },
  sendMessage: function(message){
    var sentMessage = {sender: Space.PlayerName, content: message, timestamp: "Now"};
    this.addMessage(sentMessage);
    Space.network.sendPeers({
      msg_type: "MESSAGE",
      id: Space.network.id,
      data: sentMessage
    });
  },
  init: function(){
    this._super();

    var self = this;
    Space.network.onPeerMessage('MESSAGE', function(msg){
      var receivedMessage = msg.data;
      self.addMessage(receivedMessage);
    });
  }
});

Space.GameView = Ember.View.extend({
  templateName: 'game-view',
  message: '',

  sendMessage: function(){
    this.get('controller').sendMessage(this.message);
    this.set('message', '');
    $('.send-message-text').blur();
  },

  didInsertElement: function() {
    Space.Renderer = new THREE.WebGLRenderer();
    Space.Renderer.setSize(640, 480);

    var container = $('#canvas-container');
    container.append(Space.Renderer.domElement);

    var messageBox = $('.send-message-text');
    messageBox.focus(function(){
      Space.Player.ControlsEnabled = false;
    });
    messageBox.blur(function(){
      Space.Player.ControlsEnabled = true;
    });

    var canvas = $('#canvas-container canvas');

    canvas.on('click', function(event){
      Space.Scene.requestPointerLock(this);
    });

    var WIDTH = 640,
      HEIGHT = 480;

    // set some camera attributes
    var VIEW_ANGLE = 45,
      ASPECT = WIDTH / HEIGHT,
      NEAR = 0.1,
      FAR = 10000;

    Space.Camera =
      new THREE.PerspectiveCamera(
        VIEW_ANGLE,
        ASPECT,
        NEAR,
        FAR);

    Space.Camera.update = function(){
      Space.Player.body.position.copy(Space.Camera.position);

      var cameraOffset = new CANNON.Vec3(0, 0, -100);
      var cameraWorldOffset = Space.Player.body.quaternion.vmult(cameraOffset);
      var lookAtPosition = new CANNON.Vec3(cameraWorldOffset.x + Space.Player.body.position.x,
        cameraWorldOffset.y + Space.Player.body.position.y,
        cameraWorldOffset.z + Space.Player.body.position.z);
      
      Space.Camera.lookAt(lookAtPosition);
    };

    // add the camera to the scene
    Space.Scene.addToRenderScene(Space.Camera);

    Space.Scene.requestPointerLock(canvas[0]);
  }
});