var randomInRange = function(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

var initializeWorld = function(scene) {
  for(var i = 0; i < 5; i++){
    var asteroid = new Entity(Space.network.id);
    asteroid.createDummy(scene);
    asteroid.body.position.set(randomInRange(-300, 300),
      randomInRange(-300, 300),
      randomInRange(-300, 300));
  }
};

var startScene = function(){
  var scene = new Scene(Space.network.id);

  var keyboard = new THREEx.KeyboardState();

  Space.player = new Entity(Space.network.id);
  Space.player.createDummy(scene);

  // create a point light
  var pointLight =
    new THREE.PointLight(0xFFFFFF);

  // set its position
  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;

  // add to the scene
  scene.addToRenderScene(pointLight);

  Space.network.onPeerConnected = function(peer) {
    peer.entity = new Entity(peer.id);
    peer.entity.createDummy(scene);

    trace("Peer(" + peer.id + ") successfully connected");
  };

  Space.network.onPeerMessage('WORLDSTATE', function(msg) {
    scene.updateWorldState(msg.data);
  });

  setInterval(function(){
    update();

    scene.update();

    sendWorldState();

    render();
  }, 1000.0/60.0);

  var update = function(){
    var moveDirection = new CANNON.Vec3();
    var speed = Space.PlayerInfo.get('speed');
    var max_speed = Space.PlayerInfo.get('max_speed');
    
    if( keyboard.pressed("w") && speed < max_speed){
      speed += 1;
      Space.PlayerInfo.set('speed', speed);
    }
    if( keyboard.pressed("s") && speed > 0){
      speed -= 1;
      Space.PlayerInfo.set('speed', speed);
    }
    
    moveDirection.z += -speed * 50;

    if( keyboard.pressed("d")){
      Space.player.body.angularVelocity.y -= 0.01;
    }
    
    if( keyboard.pressed("a")){
      Space.player.body.angularVelocity.y += 0.01;
    }

    var worldDirection = Space.player.body.quaternion.vmult(moveDirection);
    Space.player.body.force = worldDirection;

    if(Space.Camera){
      Space.Camera.update();
    }
  };

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

  return scene;
};

Space.JoinRoom = function(roomID) {
  trace("JoinRoom start");

  Space.network.room_id = roomID;

  Space.network.sendServer({
    msg_type: 'JOINROOM',
    data: {id: roomID}
  });

  Space.network.onServerMessage('ROOMINFO', function(msg){
    setCounterStart(Space.network.id * 100);

    $('#game_rooms').remove();
    var currentView = Space.GameView.create();
    currentView.appendTo('body');

    Space.Scene = startScene();

    // set the scene size
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
      Space.player.body.position.copy(Space.Camera.position);

      var cameraOffset = new CANNON.Vec3(0, 100, 300);
      var cameraWorldOffset = Space.player.body.quaternion.vmult(cameraOffset);
      Space.Camera.position.add(cameraWorldOffset);
      Space.Camera.lookAt(Space.player.body.position);  
    };

    // add the camera to the scene
    Space.Scene.addToRenderScene(Space.Camera);
    
    if(Space.network.isHost()){
      initializeWorld(Space.Scene);
    }
  });
};