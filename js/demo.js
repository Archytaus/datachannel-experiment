var network = networkModule.connect();
network.connectToServer("127.0.0.1", "8080");

var requestGameRooms = function() {
  trace("requestGameRooms start");
  network.sendServer({
    msg_type: 'GAMEROOMS'
  });
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

  var scene = new THREE.Scene();

  // add the camera to the scene
  scene.add(camera);

  // the camera starts at 0,0,0
  // so pull it back
  camera.position.z = 300;

  // start the renderer
  renderer.setSize(WIDTH, HEIGHT);

  // attach the render-supplied DOM element
  container.append(renderer.domElement);

  var keyboard = new THREEx.KeyboardState();

  // set up the sphere vars
  var radius = 50,
      segments = 16,
      rings = 16;

  var sphereMaterial =
  new THREE.MeshLambertMaterial(
    {
      color: 0xCC0000
    });

  // create a new mesh with
  // sphere geometry - we will cover
  // the sphereMaterial next!
  var player = new THREE.Mesh(

    new THREE.SphereGeometry(
      radius,
      segments,
      rings),

    sphereMaterial);

  // add the sphere to the scene
  scene.add(player);

  // create a point light
  var pointLight =
    new THREE.PointLight(0xFFFFFF);

  // set its position
  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;

  // add to the scene
  scene.add(pointLight);

  var update = function(){
    if( keyboard.pressed("w")){
      player.position.x += 1;
    }
    if( keyboard.pressed("s")){
      player.position.x -= 1;
    }

    network.sendPeers({data: player.position});

    camera.position = player.position.clone();
    camera.position.z = player.position.z + 300;
    
    renderer.render(scene, camera);  

    requestAnimFrame(update);
  };

  requestAnimFrame(update);
};

var JoinRoom = function(roomID) {
  trace("JoinRoom start");

  network.room_id = roomID;

  network.sendServer({
    msg_type: 'JOINROOM', 
    data: {id: roomID}
  });

  startScene();
};