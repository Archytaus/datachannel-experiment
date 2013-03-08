Space.Mouse = function(){
    
    this.deltaX = 0;
    this.deltaY = 0;
    this.element = undefined;
    this.mouseSensitivity = 1;
    this.hasFocus = false;

    this.pos = {x:-1, y:-1};
    this.x = 0;
    this.y = 0;

    var self = this;

    this.requestPointerLock = function(element){
        this.element = element;
        this.pos = {x:-1, y:-1}

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

      if (self.pos.x > $(self.element).width()) {
        self.pos.x = $(self.element).width();
      } else if (self.pos.x < 0) {
        self.pos.x = 0;
      }

      if (self.pos.y > $(self.element).height()) {
        self.pos.y = $(self.element).height();
      } else if (self.pos.y < 0) {
        self.pos.y = 0;
      }

      console.log("X: " + self.pos.x + ", Y: " + self.pos.y);
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