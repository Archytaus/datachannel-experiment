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
    asteroid.body.position.set(
      Math.randomInRange(-600, 600),
      Math.randomInRange(-600, 600),
      Math.randomInRange(-600, 600));
  }
};

//TODO: RS - This whole function is a code smell. Perhaps move it into the scene object?
var initializeScene = function(){
  var scene = new Scene(Space.network.id);

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
  var update = function(){
    scene.update();

    sendWorldState();

    render();
  };

  setInterval(update, 1000.0/60.0);

  return scene;
};

Space.JoinRoom = function(roomID) {
  Space.network.room_id = roomID;

  Space.network.sendServer({
    msg_type: 'JOINROOM',
    data: {id: roomID}
  });
  
  Space.Scene = initializeScene();

  Space.network.onServerMessage('ROOMINFO', function(msg){
    setCounterStart(Space.network.id * 100);

    if(Space.network.isHost()){
      initializeWorld(Space.Scene);
    }

    Space.Player = new Entity(Space.network.id);
    Space.Player.createDummy(Space.Scene);
    Space.Player.MoveDirection = new CANNON.Vec3();
    Space.Player.MoveSpeed = 50;

    Space.Player.IsAccelerating = function(){
      return this.scene.keyboard.pressed("w");
    };

    Space.Player.IsDecelerating = function(){
      return this.scene.keyboard.pressed("s");
    };

    Space.Player.Accelerate = function(){
      var speed = Space.PlayerInfo.get('speed');
      var max_speed = Space.PlayerInfo.get('max_speed');

      if(speed < max_speed)
      {
        speed += 1;
        Space.PlayerInfo.set('speed', speed);
        Space.Player.MoveDirection.z = -speed * Space.Player.MoveSpeed;
      }
    };

    Space.Player.Decelerate = function(){
      var speed = Space.PlayerInfo.get('speed');

      if(speed > 0)
      {
        speed -= 1;
        Space.PlayerInfo.set('speed', speed);
        Space.Player.MoveDirection.z = -speed * Space.Player.MoveSpeed;
      }
    };
    
    //TODO: RS - Move elsewhere, perhaps into the view controller?
    Space.Player.update = function() {
      
      for(var i = 0; i < 10000; i++)
      {
        var speed = Space.PlayerInfo.speed;
        var max_speed = Space.PlayerInfo.max_speed;
      }

      if (Space.Player.IsAccelerating()) {
        Space.Player.Accelerate();
      }

      if (Space.Player.IsDecelerating()) {
        Space.Player.Decelerate();
      }

      //TODO: RS - Replace keyboard rotation with mouse locked rotation
      if( this.scene.keyboard.pressed("d")){
        this.body.angularVelocity.y -= 0.01;
      }
      
      if( this.scene.keyboard.pressed("a")){
        this.body.angularVelocity.y += 0.01;
      }

      var worldDirection = this.body.quaternion.vmult(Space.Player.MoveDirection);
      this.body.force = worldDirection;

      if(Space.Camera){
        Space.Camera.update();
      }
    };

  });
};