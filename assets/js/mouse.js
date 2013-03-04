Space.Mouse = function(){
    
    this.deltaX = 0;
    this.deltaY = 0;
    this.element = undefined;

    var self = this;

    this.requestPointerLock = function(element){
        this.element = element;

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
    
    this.moveCallback = function moveCallback(e) {
        self.deltaX = e.movementX ||
          e.mozMovementX          ||
          e.webkitMovementX       ||
          0;

        self.deltaY = e.movementY ||
          e.mozMovementY      ||
          e.webkitMovementY   ||
          0;
    };

    var changeCallback = function(event){
        if (document.pointerLockElement === self.element ||
            document.mozPointerLockElement === self.element ||
            document.webkitPointerLockElement === self.element)
        {
          // Pointer was just locked
          // Enable the mousemove listener
          document.addEventListener("mousemove", self.moveCallback, false);
        } else {
          // Pointer was just unlocked
          // Disable the mousemove listener
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