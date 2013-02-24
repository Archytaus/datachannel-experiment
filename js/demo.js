Space.network = networkModule.connect();

Space.network.onServerConnected = function(){
  Space.network.sendServer({
    msg_type: 'GAMEROOMS'
  });
};

Space.network.onServerMessage('GAMEROOMS', function(msg){
  var game_rooms_response = msg.data;
  var rooms = game_rooms_response.rooms;

  for(var room_index in rooms) {
    var room = rooms[room_index];
    $('#game_rooms tbody').append("<tr><td onclick='JoinRoom(" + room.id + ")'>" + room.name + "</td><td>" + room.player_count + " / " + room.capacity + "</td></tr>");
  }
});

Space.network.connectToServer("127.0.0.1", "8080");

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
  $('#game_rooms').remove();
  var container = $('#scene');

  // set the scene size
  var WIDTH = 400,
    HEIGHT = 300;

  // set some camera attributes
  var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

  // create a WebGL renderer, camera
  // and a scene
  var renderer = new THREE.WebGLRenderer();
  var camera =
    new THREE.PerspectiveCamera(
      VIEW_ANGLE,
      ASPECT,
      NEAR,
      FAR);

  var scene = new Scene(Space.network.id);

  // add the camera to the scene
  scene.addToRenderScene(camera);

  // the camera starts at 0,0,0
  // so pull it back
  camera.position.z = 300;

  // start the renderer
  renderer.setSize(WIDTH, HEIGHT);

  // attach the render-supplied DOM element
  container.append(renderer.domElement);

  var keyboard = new THREEx.KeyboardState();

  // create a new mesh with
  // sphere geometry - we will cover
  // the sphereMaterial next!
  var player = new Entity(Space.network.id);
  player.createDummy(scene);

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

    if( keyboard.pressed("w")){
      moveDirection.z -= 500;
    }
    if( keyboard.pressed("s")){
      moveDirection.z += 500;
    }

    if( keyboard.pressed("d")){
      player.body.angularVelocity.y -= 0.01;
    }
    
    if( keyboard.pressed("a")){
      player.body.angularVelocity.y += 0.01;
    }

    var worldDirection = player.body.quaternion.vmult(moveDirection);
    player.body.force = worldDirection;

    player.body.position.copy(camera.position);

    var cameraOffset = new CANNON.Vec3(0, 100, 300);
    var cameraWorldOffset = player.body.quaternion.vmult(cameraOffset);
    camera.position.add(cameraWorldOffset);
    camera.lookAt(player.body.position);

  };

  var sendWorldState = function(){
    Space.network.sendPeers({
      msg_type: "WORLDSTATE", 
      id: Space.network.id, 
      data: scene.getWorldState(),
    });
  };

  var render = function() {
    scene.preRender();

    renderer.render(scene.scene, camera);
  };

  return scene;
};

var JoinRoom = function(roomID) {
  trace("JoinRoom start");

  Space.network.room_id = roomID;

  Space.network.sendServer({
    msg_type: 'JOINROOM', 
    data: {id: roomID}
  });

  Space.network.onServerMessage('ROOMINFO', function(msg){
    setCounterStart(Space.network.id * 100);

    var scene = startScene();

    if(Space.network.isHost()){
      initializeWorld(scene);
    }
  });
};