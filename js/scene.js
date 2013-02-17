function Scene() {
  this.scene = new THREE.Scene();
  this.world = new CANNON.World();
  this.entities = [];
  var uIDCounter = 0;

  this.world.broadphase = new CANNON.NaiveBroadphase();

  this.addToPhysicsWorld = function(obj){
    this.world.add(obj);
  };

  this.addToRenderScene = function(obj){
    this.scene.add(obj);
  };

  this.addEntity = function(entity){
    this.entities.push(entity);
    this.addToRenderScene(entity.mesh);
    this.addToPhysicsWorld(entity.body);
  };

  this.preRender = function(){
    _.each(this.entities, function(entity) {
      if(entity.preRender){
        entity.preRender();
      }
    });
  };

  this.preUpdate = function(){
    _.each(this.entities, function(entity) {
      if(entity.update){
        entity.update();
      }
    });
  };

  this.update = function(){
    this.preUpdate();
    this.world.step(1.0/60.0);
  };
}