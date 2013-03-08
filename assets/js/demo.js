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

  for(var i = 0; i < 5; i++){
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

  var mouseTexture = THREE.ImageUtils.loadTexture( "assets/textures/mouse.png" );
  Space.MouseImage = new THREE.Sprite( new THREE.SpriteMaterial( { map: mouseTexture } ) );
  Space.MouseImage.position.set( 100, 100, 1 );
  Space.MouseImage.scale.set( 32, 32, 1 );
  Space.MouseImage.visible = false;
  Space.Scene.addToRenderScene(Space.MouseImage);

  Space.network.onServerMessage('ROOMINFO', function(msg){
    setCounterStart(Space.network.id * 100);

    if(Space.network.isHost()){
      initializeWorld(Space.Scene);
    }

    Space.Player = new Entity(Space.network.id);
    Space.Player.createDummy(Space.Scene);
    Space.Player.MoveDirection = new CANNON.Vec3();
    Space.Player.MoveSpeed = 50;
    Space.Player.ControlsEnabled = true;

    Space.Player.IsAccelerating = function(){
      return Space.Player.ControlsEnabled && this.scene.keyboard.pressed("w");
    };

    Space.Player.IsDecelerating = function(){
      return Space.Player.ControlsEnabled && this.scene.keyboard.pressed("s");
    };

    Space.Player.IsStartingToType = function(){
     return Space.Player.ControlsEnabled && this.scene.keyboard.pressed("t");
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
      
      Space.MouseImage.visible = this.scene.mouse.hasFocus;

      if(this.scene.mouse.hasFocus){
        Space.MouseImage.position.set(this.scene.mouse.pos.x, this.scene.mouse.pos.y, 0);
      }

      var speed = Space.PlayerInfo.speed;
      var max_speed = Space.PlayerInfo.max_speed;

      if(Space.Player.IsStartingToType()){
        $('.send-message-text').focus();
      }

      if (Space.Player.IsAccelerating()) {
        Space.Player.Accelerate();
      }

      if (Space.Player.IsDecelerating()) {
        Space.Player.Decelerate();
      }

      if(this.scene.mouse.hasFocus){
        var mouseMoveRadius = 100;
        var mouseDirection = new THREE.Vector2( this.scene.mouse.centerOffset.x, this.scene.mouse.centerOffset.y);

        if(mouseDirection.length() > mouseMoveRadius)
        {
          mouseDirection.normalize();

          var rot = new THREE.Vector3();
          if(mouseDirection.x != 0){
            rot.y += 0.01 * mouseDirection.x;
          }

          if(mouseDirection.y != 0){
            rot.x -= 0.01 * mouseDirection.y;
          }

          var rotationalOffset = new THREE.Quaternion();
          rotationalOffset.setFromEuler(rot);

          var angularVelocity = new THREE.Vector3(this.body.angularVelocity.x + rot.x,
                  this.body.angularVelocity.y + rot.y, this.body.angularVelocity.z + rot.z);

          // rotationalOffset.multiplyVector3(angularVelocity);
          this.body.angularVelocity = new CANNON.Vec3(angularVelocity.x, angularVelocity.y, angularVelocity.z);

          var worldDirection = this.body.quaternion.vmult(Space.Player.MoveDirection);
          this.body.force = worldDirection;
        }

      }

      if(Space.Camera){
        Space.Camera.update();
      }
    };

  });
};