function Entity() {
  this.body = undefined;
  this.mesh = undefined;
  this.id = undefined;
  
  this.preRender = function(){
    this.body.position.copy(this.mesh.position);
    this.body.quaternion.copy(this.mesh.quaternion);
  };

  this.update = function(){

  };

  this.setFromNetworkState = function(state){
    this.body.position.set(state.position.x, state.position.y, state.position.z);
    this.body.quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
    this.body.velocity.set(state.velocity.x, state.velocity.y, state.velocity.z);        
  };

  this.networkState = function(){
    return {
        position: this.body.position,
        quaternion: this.body.quaternion,
        velocity: this.body.velocity
      };
  };

  this.createDummy = function(scene) {
    // set up the sphere vars
    var radius = 50,
        segments = 16,
        rings = 16;

    var sphereMaterial = new THREE.MeshLambertMaterial(
      {
        color: 0xCC0000
      });

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, rings),
      sphereMaterial);
    this.mesh.useQuaternion = true;
    
    // Create a sphere
    var mass = 5, radius = 1;
    var sphereShape = new CANNON.Sphere(radius);
    this.body = new CANNON.RigidBody(mass, sphereShape);
    world.add(entity.body);

    scene.addEntity(this);
  };
}