function Scene() {
  this.scene = new THREE.Scene();
  this.world = new CANNON.World();
  this.entities = [];
  var uIDCounter = 0;
  
  world.broadphase = new CANNON.NaiveBroadphase();

  this.addToPhysicsWorld = function(obj){
    world.add(obj);
  };

  this.addToRenderScene = function(obj){
    scene.add(obj);
  };

  this.addEntity = function(entity){
    this.entities.push(entity);
    addToRenderScene(entity.mesh);
    addToPhysicsWorld(entity.body);
  };

  this.preRender = function(){
    _.each(entities, function(entity) {
      if(entity.preRender){
        entity.preRender();
      }
    });
  };

  this.update = function(){
    _.each(entities, function(entity) {
      if(entity.update){
        entity.update();
      }
    });
  };
}