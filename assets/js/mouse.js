Space.Mouse = function(){

    this.deltaX = 0;
    this.deltaY = 0;
    this.element = undefined;
    this.mouseSensitivity = 1;
    this.hasFocus = false;

    this.pos = {x:-1, y:-1};
    this.centerOffset = {x:-1, y:-1};
    this.screenCenter = {x:-1, y:-1};
    this.screenSize = {width: -1, height: -1};

    this.x = 0;
    this.y = 0;

    var self = this;

    this.requestPointerLock = function(element){
      if(this.hasFocus)
        return;

      this.element = element;

      this.centerOffset = {x:-1, y:-1};
      this.screenSize = {width: $(self.element).width(),
                         height: $(self.element).height() };

      this.screenCenter = {x: this.screenSize.width / 2.0,
                           y: this.screenSize.height / 2.0};

      this.pos = {x: this.screenCenter.x, 
                  y: this.screenCenter.y};

      element.requestPointerLock = element.requestPointerLock ||
          element.mozRequestPointerLock ||
          element.webkitRequestPointerLock;

      element.requestPointerLock();

      // Hook pointer lock state change events
      document.addEventListener('pointerlockchange', changeCallback, false);
      document.addEventListener('mozpointerlockchange', changeCallback, false);
      document.addEventListener('webkitpointerlockchange', changeCallback, false);
    };

    this.exitPointerLock = function(){
      document.exitPointerLock();
    };

    this.reset = function(){
      self.deltaX = self.deltaY = 0;
    };

    this.move = function(x ,y){
      self.pos.x += x;
      self.pos.y += y;

      checkMouseBounds();
    };

    this.moveCallback = function moveCallback(e) {
      if (self.pos.x == -1) {
        self.pos = getPosition(self.element, e);
      }

      self.deltaX = e.movementX ||
        e.mozMovementX          ||
        e.webkitMovementX       ||
        0;

      self.deltaY = e.movementY ||
        e.mozMovementY      ||
        e.webkitMovementY   ||
        0;

      self.pos.x = self.pos.x + self.deltaX * self.mouseSensitivity;
      self.pos.y = self.pos.y + self.deltaY * self.mouseSensitivity;

      checkMouseBounds();
    };

    var checkMouseBounds = function(){

      self.centerOffset.x = self.screenCenter.x - self.pos.x;
      self.centerOffset.y = self.screenCenter.y - self.pos.y;

      if (self.pos.x > self.screenSize.width) {
        self.pos.x = self.screenSize.width;
      } else if (self.pos.x < 0) {
        self.pos.x = 0;
      }

      if (self.pos.y > self.screenSize.height) {
        self.pos.y = self.screenSize.height;
      } else if (self.pos.y < 0) {
        self.pos.y = 0;
      }
    };

    // Returns a position based on a mouseevent on a canvas. Based on code
    // from here: http://miloq.blogspot.nl/2011/05/coordinates-mouse-click-canvas.html
    var getPosition = function(canvas, event) {
      var x = 0;
      var y = 0;

      if (event.x != undefined && event.y != undefined) {
        x = event.x;
        y = event.y;
      }
      else // Firefox method to get the position
      {
        x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }

      x -= canvas.offsetLeft;
      y -= canvas.offsetTop;

      return {x:x, y:y};
    };

    var changeCallback = function(event){
        if (document.pointerLockElement === self.element ||
            document.mozPointerLockElement === self.element ||
            document.webkitPointerLockElement === self.element)
        {
          // Pointer was just locked
          // Enable the mousemove listener
          self.hasFocus = true;
          document.addEventListener("mousemove", self.moveCallback, false);
        } else {
          // Pointer was just unlocked
          // Disable the mousemove listener
          self.hasFocus = false;
          document.removeEventListener("mousemove", self.moveCallback, false);
          // self.unlockHook(self.element);
        }
    };

    var errorCallback = function(event){
        console.log("Error with mouse");
    };

    document.exitPointerLock = document.exitPointerLock ||
        document.mozExitPointerLock ||
        document.webkitExitPointerLock;

    document.addEventListener('pointerlockerror', errorCallback, false);
    document.addEventListener('mozpointerlockerror', errorCallback, false);
    document.addEventListener('webkitpointerlockerror', errorCallback, false);
};