var network = networkModule.connect();
network.connectToServer("127.0.0.1", "8080");

var requestGameRooms = function() {
  trace("requestGameRooms start");
  network.sendServer({
    msg_type: 'GAMEROOMS'
  });
};

var JoinRoom = function(roomID) {
  trace("JoinRoom start");

  network.room_id = roomID;

  network.sendServer({
    msg_type: 'JOINROOM', 
    data: {id: roomID}
  });

  $('#game_rooms').remove();
  var scene = $('#scene');
};