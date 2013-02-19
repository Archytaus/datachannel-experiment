var network = networkModule.connect();
network.connectToServer("127.0.0.1", "8080");

var requestGameRooms = function() {
  trace("requestGameRooms start");
  network.sendServer({
    msg_type: 'GAMEROOMS'
  });
};

var randomInRange = function(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

var initializeWorld = function(scene) {
  for(var i = 0; i < 30; i++){
    var asteroid = new Entity();
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

  var scene = new Scene();

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
  var player = new Entity();
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

  network.onPeerConnected = function(peer) {
    peer.entity = new Entity();
    peer.entity.createDummy(scene);

    trace("Peer(" + peer.id + ") successfully connected");
  };

  network.onPeerMessage('PLAYERSTATE', function(msg) {
    var peer = network.findPeer(msg.id);
    peer.entity.setFromNetworkState(msg.data);
  });

  setInterval(function(){
    update();

    scene.update();

    sendWorldState();

    render();
  }, 1000.0/60.0);

  var update = function(){
    if( keyboard.pressed("w")){
      player.body.velocity.z -= 1;
    }
    if( keyboard.pressed("s")){
      player.body.velocity.z += 1;
    }

    player.body.position.copy(camera.position);
    camera.position.z += 300;
    camera.position.y += 100;
  };

  var sendWorldState = function(){
    network.sendPeers({
      msg_type: "PLAYERSTATE", 
      id: network.id, 
      data: player.networkState(),
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

  network.room_id = roomID;

  network.sendServer({
    msg_type: 'JOINROOM', 
    data: {id: roomID}
  });

  network.onServerMessage('ROOMINFO', function(msg){
    var scene = startScene();

    if(network.isHost()){
      initializeWorld(scene);
    }
  });
};