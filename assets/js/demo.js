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

      //Create a quaternion to represent the target rotation
      var yaw = new CANNON.Quaternion();
      var pitch = new CANNON.Quaternion();

      if(this.scene.mouse.deltaX != 0){
        yaw.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), (0.01 / 60.0) * this.scene.mouse.deltaX);
      }

      if(this.scene.mouse.deltaY != 0){
        yaw.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), (0.01 / 60.0) * this.scene.mouse.deltaY);
      }
      var rotationalOffset = new CANNON.Quaternion();
      rotationalOffset = rotationalOffset.mult(yaw);
      rotationalOffset = rotationalOffset.mult(pitch);

      //this.body.quaternion = this.body.quaternion.mult(rotationalOffset);

      //This will be represented by the mouse pointer

      //Apply torque towards the target rotation
      var angularVelocityX = new CANNON.Quaternion();
      var angularVelocityY = new CANNON.Quaternion();
      var angularVelocityZ = new CANNON.Quaternion();

      angularVelocityX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), this.body.angularVelocity.x);
      angularVelocityY.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.body.angularVelocity.y);
      angularVelocityZ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.body.angularVelocity.z);

      var angularVelocity = new CANNON.Quaternion();
      angularVelocity = angularVelocity.mult(rotationalOffset);

      angularVelocity = angularVelocity.mult(angularVelocityX);
      angularVelocity = angularVelocity.mult(angularVelocityY);
      angularVelocity = angularVelocity.mult(angularVelocityZ);

      var newVelocity = new CANNON.Vec3();
      angularVelocity.toEuler(newVelocity, "YZX");
      this.body.angularVelocity = newVelocity;
      
      // Look into elastic / rope physics for the difference between ship rotation and target reticule

      // this.body.angularVelocity.vadd(angularVelocityOffset, this.body.angularVelocity);
      // var maxRotation = this.body.angularVelocity.normalize();
      
      // if(maxRotation > 1)
      //   maxRotation = 1;

      // this.body.angularVelocity.mult(maxRotation, this.body.angularVelocity);
      
      // this.body.angularVelocity.x += (0.5 * 1.0 / 60.0) * this.scene.mouse.deltaY;
      // this.body.angularVelocity.y += (0.5 * 1.0 / 60.0) * this.scene.mouse.deltaX;
      
      var worldDirection = this.body.quaternion.vmult(Space.Player.MoveDirection);
      this.body.force = worldDirection;

      if(Space.Camera){
        Space.Camera.update();
      }
    };

  });
};