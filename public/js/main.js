/**
 * Main JavaScript file for Raha Application
 */

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize charts if they exist on the page
  initializeCharts();
  
  // Initialize WebRTC for video sessions if on the session page
  if (document.getElementById('video-call-container')) {
    initializeWebRTC();
  }
  
  // Initialize real-time messaging if on the conversation page
  if (document.getElementById('chat-container')) {
    initializeRealTimeMessaging();
  }
});

/**
 * Initialize Chart.js charts
 */
function initializeCharts() {
  // Stress level chart
  const stressChartElement = document.getElementById('stress-chart');
  if (stressChartElement) {
    const ctx = stressChartElement.getContext('2d');
    
    // Get data from the data attribute
    const chartData = JSON.parse(stressChartElement.dataset.chartData || '[]');
    
    if (chartData.length > 0) {
      const labels = chartData.map(item => item.survey_date);
      const data = chartData.map(item => item.average_stress);
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'مستوى الضغط',
            data: data,
            backgroundColor: 'rgba(79, 70, 229, 0.2)',
            borderColor: 'rgba(79, 70, 229, 1)',
            borderWidth: 2,
            tension: 0.3,
            pointBackgroundColor: 'rgba(79, 70, 229, 1)',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.raw + '%';
                }
              }
            }
          }
        }
      });
    }
  }
  
  // Statistics chart for psychologists
  const statsChartElement = document.getElementById('statistics-chart');
  if (statsChartElement) {
    const ctx = statsChartElement.getContext('2d');
    
    // Get data from the data attribute
    const chartData = JSON.parse(statsChartElement.dataset.chartData || '[]');
    
    if (chartData.length > 0) {
      const labels = chartData.map(item => item.survey_date);
      const data = chartData.map(item => item.average_stress);
      const userCounts = chartData.map(item => item.user_count);
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'متوسط مستوى الضغط',
              data: data,
              backgroundColor: 'rgba(79, 70, 229, 0.7)',
              borderColor: 'rgba(79, 70, 229, 1)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: 'عدد المستخدمين',
              data: userCounts,
              backgroundColor: 'rgba(16, 185, 129, 0.7)',
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 1,
              type: 'line',
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              position: 'left',
              title: {
                display: true,
                text: 'متوسط مستوى الضغط (%)'
              },
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              title: {
                display: true,
                text: 'عدد المستخدمين'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
    }
  }
}

/**
 * Initialize WebRTC for video sessions
 */
function initializeWebRTC() {
  // Check if WebRTC is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('متصفحك لا يدعم مكالمات الفيديو. يرجى استخدام متصفح حديث.');
    return;
  }
  
  const videoContainer = document.getElementById('video-call-container');
  const localVideo = document.getElementById('local-video');
  const remoteVideo = document.getElementById('remote-video');
  const startCallBtn = document.getElementById('start-call');
  const endCallBtn = document.getElementById('end-call');
  
  let localStream;
  let peerConnection;
  let sessionId = videoContainer.dataset.sessionId;
  let role = videoContainer.dataset.userRole;
  
  // Socket.io connection
  const socket = io();
  
  // Join the session room
  socket.emit('join-session', {
    sessionId: sessionId,
    role: role
  });
  
  // Start call button click handler
  if (startCallBtn) {
    startCallBtn.addEventListener('click', async () => {
      try {
        // Get local media stream
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Display local video
        localVideo.srcObject = localStream;
        
        // Create peer connection
        createPeerConnection();
        
        // Add local stream to peer connection
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
        
        // Create and send offer if user is psychologist
        if (role === 'psychologist') {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          socket.emit('offer', {
            sessionId: sessionId,
            offer: offer
          });
        }
        
        // Show end call button and hide start call button
        startCallBtn.classList.add('hidden');
        endCallBtn.classList.remove('hidden');
      } catch (error) {
        console.error('Error starting call:', error);
        alert('حدث خطأ أثناء بدء المكالمة. يرجى التحقق من إذن الكاميرا والميكروفون.');
      }
    });
  }
  
  // End call button click handler
  if (endCallBtn) {
    endCallBtn.addEventListener('click', () => {
      endCall();
      socket.emit('end-call', { sessionId: sessionId });
    });
  }
  
  // Socket.io event handlers
  socket.on('offer', async (data) => {
    if (data.sessionId === sessionId && role === 'employee') {
      // Get local media stream if not already available
      if (!localStream) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localVideo.srcObject = localStream;
        } catch (error) {
          console.error('Error getting local stream:', error);
          return;
        }
      }
      
      // Create peer connection if not already created
      if (!peerConnection) {
        createPeerConnection();
        
        // Add local stream to peer connection
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }
      
      // Set remote description (offer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      socket.emit('answer', {
        sessionId: sessionId,
        answer: answer
      });
      
      // Show end call button and hide start call button
      startCallBtn.classList.add('hidden');
      endCallBtn.classList.remove('hidden');
    }
  });
  
  socket.on('answer', async (data) => {
    if (data.sessionId === sessionId && role === 'psychologist') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });
  
  socket.on('ice-candidate', (data) => {
    if (data.sessionId === sessionId && peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });
  
  socket.on('end-call', (data) => {
    if (data.sessionId === sessionId) {
      endCall();
    }
  });
  
  // Create WebRTC peer connection
  function createPeerConnection() {
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    // ICE candidate event
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          sessionId: sessionId,
          candidate: event.candidate
        });
      }
    };
    
    // Track event (remote stream)
    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };
  }
  
  // End call function
  function endCall() {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    
    // Show start call button and hide end call button
    startCallBtn.classList.remove('hidden');
    endCallBtn.classList.add('hidden');
  }
}

/**
 * Initialize real-time messaging
 */
function initializeRealTimeMessaging() {
  const chatContainer = document.getElementById('chat-container');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const messagesContainer = document.getElementById('messages-container');
  
  if (!chatContainer || !messageForm || !messageInput || !messagesContainer) return;
  
  const receiverId = chatContainer.dataset.receiverId;
  const senderId = chatContainer.dataset.senderId;
  
  // Socket.io connection
  const socket = io();
  
  // Join the chat room
  socket.emit('join-chat', {
    senderId: senderId,
    receiverId: receiverId
  });
  
  // Message form submit handler
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    try {
      // Send message to server via API
      const response = await fetch('/support/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_id: receiverId,
          message: message
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Clear input
        messageInput.value = '';
        
        // Emit message to socket.io
        socket.emit('new-message', {
          senderId: senderId,
          receiverId: receiverId,
          message: message
        });
        
        // Add message to UI
        addMessageToUI(message, 'sent');
        
        // Scroll to bottom
        scrollToBottom();
      } else {
        alert('حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.');
    }
  });
  
  // Socket.io event handlers
  socket.on('new-message', (data) => {
    if (data.senderId.toString() === receiverId.toString()) {
      // Add message to UI
      addMessageToUI(data.message, 'received');
      
      // Scroll to bottom
      scrollToBottom();
      
      // Mark message as read
      fetch(`/support/mark-read/${data.messageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.error('Error marking message as read:', error);
      });
    }
  });
  
  // Add message to UI
  function addMessageToUI(message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type === 'sent' ? 'message-sent' : 'message-received');
    messageElement.textContent = message;
    
    messagesContainer.appendChild(messageElement);
  }
  
  // Scroll to bottom of messages container
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Initial scroll to bottom
  scrollToBottom();
}
