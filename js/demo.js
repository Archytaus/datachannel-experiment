//TODO: RS - Move into the util file and extend the Math Prototype
var randomInRange = function(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

var initializeWorld = function(scene) {
  // create a point light
  var pointLight =
    new THREE.PointLight(0xFFFFFF);

  // set its position
  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;

  // add to the scene
  scene.addToRenderScene(pointLight);

  for(var i = 0; i < 10; i++){
    var asteroid = new Entity(Space.network.id);
    asteroid.createDummy(scene);
    asteroid.body.position.set(randomInRange(-600, 600),
      randomInRange(-600, 600),
      randomInRange(-600, 600));
  }
};

//TODO: RS - This whole function is a code smell. Perhaps move it into the scene object?
var startScene = function(){
  var scene = new Scene(Space.network.id);

  Space.Player = new Entity(Space.network.id);
  Space.Player.createDummy(scene);

  if(Space.network.isHost()){
    initializeWorld(scene);
  }

  Space.network.onPeerConnected = function(peer) {
    peer.entity = new Entity(peer.id);
    peer.entity.createDummy(scene);

    trace("Peer(" + peer.id + ") successfully connected");
  };

  Space.network.onPeerMessage('WORLDSTATE', function(msg) {
    scene.updateWorldState(msg.data);
  });

  var sendWorldState = function(){
    Space.network.sendPeers({
      msg_type: "WORLDSTATE",
      id: Space.network.id,
      data: scene.getWorldState()
    });
  };

  var render = function() {
    scene.preRender();

    if(Space.Renderer && Space.Camera){
      Space.Renderer.render(scene.scene, Space.Camera);
    }
  };

  setInterval(function(){
    scene.update();

    sendWorldState();

    render();
  }, 1000.0/60.0);

  return scene;
};

Space.JoinRoom = function(roomID) {
  Space.network.room_id = roomID;

  Space.network.sendServer({
    msg_type: 'JOINROOM',
    data: {id: roomID}
  });

  Space.network.onServerMessage('ROOMINFO', function(msg){
    setCounterStart(Space.network.id * 100);

    //TODO: RS - Can this be done so that this file doesn't have to bother with DOM Manipulation?
    $('#game_rooms').remove();
    var currentView = Space.GameView.create();
    currentView.appendTo('body');

    Space.Scene = startScene();

    //TODO: RS - Move elsewhere, perhaps into the view controller?
    Space.Player.update = function() {
      var moveDirection = new CANNON.Vec3();
      var speed = Space.PlayerInfo.get('speed');
      var max_speed = Space.PlayerInfo.get('max_speed');
      
      if( this.scene.keyboard.pressed("w") && speed < max_speed){
        speed += 1;
        Space.PlayerInfo.set('speed', speed);
      }
      if( this.scene.keyboard.pressed("s") && speed > 0){
        speed -= 1;
        Space.PlayerInfo.set('speed', speed);
      }
      
      moveDirection.z += -speed * 50;

      if( this.scene.keyboard.pressed("d")){
        this.body.angularVelocity.y -= 0.01;
      }
      
      if( this.scene.keyboard.pressed("a")){
        this.body.angularVelocity.y += 0.01;
      }

      var worldDirection = this.body.quaternion.vmult(moveDirection);
      this.body.force = worldDirection;

      if(Space.Camera){
        Space.Camera.update();
      }
    };

  });
};