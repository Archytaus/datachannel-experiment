Space = Ember.Application.create({
  connected: false
});

Space.Room = Ember.Object.extend({
  id: 0,
  name: null, 
  player_count: null,
  capacity: 0,
});

Space.PlayerInfo = Ember.Object.create({
  speed: 0,
  max_speed: 50,
});

Space.RoomsController = Ember.ArrayController.create({
  content: [],
  joinRoom: function(room){
    console.log("Joining room: " + room.id);

    Space.JoinRoom(room.id);
  },
});

Space.GameView = Ember.View.create({
  templateName: 'game-view',
});