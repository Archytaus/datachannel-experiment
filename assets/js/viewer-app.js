//TODO: RS - Move these functions / declarations into appropriate files
Space = Ember.Application.create();

Space.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
Space.ApplicationController = Ember.Controller.extend();

Space.ViewerView = Ember.View.extend({
  templateName: 'viewer',
  player_name: '',
  didInsertElement: function() {
    $('header h1.heading').css("font-size","66px");
  
    Space.Renderer = new THREE.WebGLRenderer();
    Space.Renderer.setSize(640, 480);

    var container = $('#canvas-container');
    container.append(Space.Renderer.domElement);

    Space.StartScene();

    var WIDTH = 640,
      HEIGHT = 480;

    // set some camera attributes
    var VIEW_ANGLE = 45,
      ASPECT = WIDTH / HEIGHT,
      NEAR = 0.1,
      FAR = 10000;

    Space.Camera =
      new THREE.PerspectiveCamera(
        VIEW_ANGLE,
        ASPECT,
        NEAR,
        FAR);

    // add the camera to the scene
    Space.Scene.addToRenderScene(Space.Camera);
  }
});

Space.Router.map(function(){
  this.route("viewer");
  this.route("rooms");
  this.route("game");
});

Space.IndexRoute = Ember.Route.extend({
  redirect: function () {
    this.transitionTo('viewer');
  }
});