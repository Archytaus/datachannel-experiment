Space = Ember.Application.create({
  connected: false
});

Space.Room = Ember.Object.extend({
  id: 0,
  name: null, 
  player_count: null,
  capacity: 0,
});

Space.RoomsController = Ember.ArrayController.create({
  content: [],
  joinRoom: function(room){
    console.log("Joining room: " + room.id);

    Space.JoinRoom(room.id);
  },
});