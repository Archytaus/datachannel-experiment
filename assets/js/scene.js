function Scene(peer_id) {
  this.peer_id = peer_id;
  this.scene = new THREE.Scene();
  this.world = new CANNON.World();
  this.entities = {};

  this.world.broadphase = new CANNON.NaiveBroadphase();
  this.keyboard = new THREEx.KeyboardState();
  this.mouse = new Space.Mouse();

  this.addToPhysicsWorld = function(obj){
    this.world.add(obj);
  };

  this.addToRenderScene = function(obj){
    this.scene.add(obj);
  };

  this.addEntity = function(entity){
    this.entities[entity.id] = entity;

    this.addToRenderScene(entity.mesh);
    this.addToPhysicsWorld(entity.body);
  };

  this.preRender = function(){
    _.each(this.entities, function(entity, id) {
      if(entity.preRender){
        entity.preRender();
      }
    });
  };

  this.preUpdate = function(){
    _.each(this.entities, function(entity, id) {
      if(entity.update){
        entity.update();
      }
    });
  };

  this.update = function(){
    this.preUpdate();
    this.world.step(1.0/60.0);
  };

  this.findEntity = function(entity_id){
    return this.entities[entity_id];
  };

  this.getWorldState = function(){
    var self = this;
    var my_owned_entities = _.filter(this.entities, function (entity, id) {
      return entity.owner_id == self.peer_id; });
    return _.map(my_owned_entities, function (entity) { return entity.networkState(); });
  };

  this.updateWorldState = function(state) {
    var self = this;
    _.each(state, function (network_state) {
      var entity = self.findEntity(network_state.id);
      if(entity) {
        entity.setFromNetworkState(network_state);
      }
      else {
        entity = new Entity(self.id);
        entity.createDummyFromState(self, network_state);
      }
    });
  };

  this.requestPointerLock = function(element){
    this.mouse.requestPointerLock(element);
  };
}