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

Space.Router.map(function(){
  this.route("rooms");
});

Space.RoomsRoute = Ember.Route.extend({
  setupController: function(controller) {
    controller.set('content', []);
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
  templateName: 'rooms'
});

Space.PlayerInfo = Ember.Object.create({
  speed: 0,
  max_speed: 50
});

Space.GameView = Ember.View.extend({
  templateName: 'game-view',
  controller: Space.PlayerInfo,

  didInsertElement: function() {
    Space.Renderer = new THREE.WebGLRenderer();
    Space.Renderer.setSize(640, 480);

    var container = $('#canvas-container');
    container.append(Space.Renderer.domElement);

    var canvas = $('#canvas-container canvas');
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

      var cameraOffset = new CANNON.Vec3(0, 100, 300);
      var cameraWorldOffset = Space.Player.body.quaternion.vmult(cameraOffset);
      Space.Camera.position.add(cameraWorldOffset);
      Space.Camera.lookAt(Space.Player.body.position);
    };

    // add the camera to the scene
    Space.Scene.addToRenderScene(Space.Camera);
  }
});