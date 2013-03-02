if (navigator.mozGetUserMedia) {
  window.RTCPeerConnection = mozRTCPeerConnection;
} else if (navigator.webkitGetUserMedia) {
  window.RTCPeerConnection = webkitRTCPeerConnection; 
}