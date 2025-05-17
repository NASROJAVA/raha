/**
 * WebRTC Handler for Psychologist Session System
 * Handles WebRTC peer connection, media streams, and signaling
 */
class WebRTCHandler {
  constructor(options = {}) {
    this.socket = options.socket;
    this.sessionId = options.sessionId;
    this.localVideo = options.localVideo;
    this.remoteVideo = options.remoteVideo;
    this.localStream = null;
    this.peerConnection = null;
    this.isInitiator = options.isInitiator || false;
    this.userId = options.userId;
    this.userRole = options.userRole;
    
    // Track media state
    this.videoEnabled = true;
    this.audioEnabled = true;
    
    console.log(`WebRTC Handler initialized with sessionId: ${this.sessionId}, userId: ${this.userId}, userRole: ${this.userRole}, isInitiator: ${this.isInitiator}`);
    this.onCallStarted = options.onCallStarted || function () { };
    this.onCallEnded = options.onCallEnded || function () { };

    // ICE servers (STUN/TURN)
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add free public TURN servers
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    // Listen for signaling messages
    this.socket.on('webrtc-offer', async (data) => {
      if (data.sessionId === this.sessionId && data.from !== this.userId) {
        console.log('Received WebRTC offer', data);
        await this.handleOffer(data.offer);
      }
    });

    this.socket.on('webrtc-answer', (data) => {
      if (data.sessionId === this.sessionId && data.from !== this.userId) {
        console.log('Received WebRTC answer', data);
        this.handleAnswer(data.answer);
      }
    });

    this.socket.on('webrtc-ice-candidate', (data) => {
      if (data.sessionId === this.sessionId && data.from !== this.userId) {
        console.log('Received ICE candidate', data);
        this.handleIceCandidate(data.candidate);
      }
    });

    // Handle session events
    this.socket.on('user-joined-session', (data) => {
      console.log('User joined session:', data);

      // If we are the psychologist, always initiate call when someone joins
      if (this.userRole === 'psychologist') {
        this.isInitiator = true;
        console.log(`Psychologist will initiate the call for session ${this.sessionId}`);
        // Clean up existing connection if any
        if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
        }
        // Start local media and then initiate the call
        this.startLocalStream().then(success => {
          if (success) {
            // Create new connection and initiate call
            this.createPeerConnection();
            this.initiateCall();
          } else {
            console.error('Failed to start local media stream');
          }
        });
      } else {
        // If we're the employee, we should just ensure our local media is ready
        this.startLocalStream().then(success => {
          if (success) {
            console.log(`Employee's local stream is ready for session ${this.sessionId}`);
          } else {
            console.error('Failed to start local media stream');
          }
        });
      }
    });

    // Handle user leaving
    this.socket.on('user-left-session', (data) => {
      if (data.sessionId === this.sessionId && data.userId !== this.userId) {
        console.log('User left session:', data);
        // Clean up connection
        if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
        }
        // Update UI
        this.onCallEnded();
      }
    });
  }

  async startLocalStream(constraints = { audio: true, video: true }) {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API not supported in this browser');
        return false;
      }
      
      // Apply saved track states to constraints
      if (constraints.video && !this.videoEnabled) {
        // We still request video but will disable it after getting the stream
        console.log('Video will be disabled based on previous state');
      }
      
      if (constraints.audio && !this.audioEnabled) {
        // We still request audio but will disable it after getting the stream
        console.log('Audio will be disabled based on previous state');
      }

      // First try with ideal constraints
      try {
        // نحاول أولاً فيديو + صوت
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (error) {
        console.warn('فشل الوصول إلى الفيديو + الصوت، سنحاول الفيديو فقط:', error);

        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (videoOnlyError) {
          console.error('فشل الوصول إلى الكاميرا:', videoOnlyError);
          alert('لم يتم العثور على كاميرا. تأكد من أن الجهاز يحتوي على كاميرا.');
          return false;
        }
      }


      // If we got here, we have a stream
      if (this.localVideo && this.localStream) {
        // Apply saved track states
        const videoTracks = this.localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTracks[0].enabled = this.videoEnabled;
          console.log(`Set video track enabled: ${this.videoEnabled}`);
        }
        
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].enabled = this.audioEnabled;
          console.log(`Set audio track enabled: ${this.audioEnabled}`);
        }
        
        // Set video element source
        this.localVideo.srcObject = this.localStream;
        this.localVideo.onloadedmetadata = () => {
          this.localVideo.play().catch(e => console.error('Error playing local video:', e));
        };
      }

      console.log('Local stream started successfully');
      return true;
    } catch (error) {
      console.error('Error accessing media devices:', error);

      // Log specific error types for debugging
      let errorMessage = 'حدث خطأ أثناء محاولة الوصول إلى الكاميرا أو الميكروفون.';

      if (error.name) {
        switch (error.name) {
          case 'NotFoundError':
            errorMessage = 'لم يتم العثور على كاميرا أو ميكروفون. تأكد من أن الجهاز يحتوي على هذه المكونات.';
            break;
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            errorMessage = 'تم رفض الإذن للوصول إلى الكاميرا أو الميكروفون. يرجى السماح بذلك من إعدادات المتصفح.';
            break;
          case 'NotReadableError':
          case 'AbortError':
            errorMessage = 'الكاميرا أو الميكروفون قيد الاستخدام من قبل تطبيق آخر.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'القيود المطلوبة لا يمكن تحقيقها. حاول استعمال إعدادات أبسط.';
            break;
          case 'SecurityError':
            errorMessage = 'رفض الوصول بسبب قيود الأمان. تأكد من أنك تستخدم اتصال HTTPS أو localhost.';
            break;
          case 'TypeError':
            errorMessage = 'تم تمرير معايير غير صالحة. تحقق من تنسيق القيود.';
            break;
          default:
            errorMessage = 'خطأ غير معروف: ' + error.name;
        }
      }

      alert(errorMessage);


      return false;
    }
  }

  createPeerConnection() {
    try {
      console.log('Creating peer connection with ICE servers:', JSON.stringify(this.iceServers));
      this.peerConnection = new RTCPeerConnection(this.iceServers);
      
      // Add connection state logging
      this.peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state changed to: ${this.peerConnection.connectionState}`);
      });
      
      this.peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log(`ICE connection state: ${this.peerConnection.iceConnectionState}`);
        
        if (this.peerConnection.iceConnectionState === 'connected' ||
            this.peerConnection.iceConnectionState === 'completed') {
          console.log('ICE connection established successfully');
        }
      });
      
      this.peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(`ICE gathering state: ${this.peerConnection.iceGatheringState}`);
      });

      // Add local stream tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate (${event.candidate.type} - ${event.candidate.protocol})`, event.candidate);
          this.socket.emit('webrtc-ice-candidate', {
            sessionId: this.sessionId,
            candidate: event.candidate,
            from: this.userId
          });
        } else {
          // Null candidate means ICE gathering is complete
          console.log('ICE gathering completed');
        }
      };

      // Handle incoming remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track', event);
        if (this.remoteVideo) {
          this.remoteVideo.srcObject = event.streams[0];
          // Always call onCallStarted when we receive a track
          this.onCallStarted();
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);

        if (this.peerConnection.connectionState === 'disconnected' ||
          this.peerConnection.connectionState === 'failed' ||
          this.peerConnection.connectionState === 'closed') {
          this.onCallEnded();
        }
      };

      console.log('Peer connection created');
      return true;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      return false;
    }
  }

  async initiateCall() {
    try {
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      // Ensure we have local stream before creating offer
      if (!this.localStream) {
        const streamStarted = await this.startLocalStream();
        if (!streamStarted) {
          console.error('Failed to start local stream');
          return;
        }
      }

      console.log('Creating offer');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      console.log('Sending offer');
      this.socket.emit('webrtc-offer', {
        sessionId: this.sessionId,
        offer: offer,
        from: this.userId
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      // Clean up on error
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
    }
  }

  async handleOffer(offer) {
    try {
      console.log(`Handling WebRTC offer for session ${this.sessionId}`);
      
      // Ensure we have local stream first
      if (!this.localStream) {
        console.log('Local stream not found, starting it now...');
        const streamStarted = await this.startLocalStream();
        if (!streamStarted) {
          console.error('Failed to start local stream when handling offer');
          return;
        }
      }

      // Clean up any existing connection
      if (this.peerConnection) {
        console.log('Closing existing peer connection before creating a new one');
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Create new connection
      this.createPeerConnection();

      console.log('Setting remote description (offer)');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      console.log('Creating answer');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      console.log('Sending answer');
      this.socket.emit('webrtc-answer', {
        sessionId: this.sessionId,
        answer: answer,
        from: this.userId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      // Clean up on error
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
    }
  }

  async handleAnswer(answer) {
    try {
      console.log('Setting remote description (answer)');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        console.log('Adding ICE candidate');
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // Media control methods
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // Toggle and store the state for reconnections
        videoTrack.enabled = !videoTrack.enabled;
        this.videoEnabled = videoTrack.enabled;
        console.log(`Video track toggled to: ${this.videoEnabled}`);
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        // Toggle and store the state for reconnections
        audioTrack.enabled = !audioTrack.enabled;
        this.audioEnabled = audioTrack.enabled;
        console.log(`Audio track toggled to: ${this.audioEnabled}`);
        return audioTrack.enabled;
      }
    }
    return false;
  }

  async shareScreen() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track with screen track
      const videoTrack = screenStream.getVideoTracks()[0];

      if (videoTrack && this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find(sender =>
          sender.track && sender.track.kind === 'video'
        );

        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        }

        // Handle track end event
        videoTrack.onended = () => {
          this.stopScreenSharing();
        };

        // Update local video
        if (this.localVideo) {
          this.localVideo.srcObject = screenStream;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sharing screen:', error);
      return false;
    }
  }

  async stopScreenSharing() {
    try {
      // Restore camera video track
      if (this.peerConnection && this.localStream) {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraTrack = cameraStream.getVideoTracks()[0];

        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find(sender =>
          sender.track && sender.track.kind === 'video'
        );

        if (videoSender && cameraTrack) {
          await videoSender.replaceTrack(cameraTrack);
        }

        // Update local video
        if (this.localVideo) {
          this.localVideo.srcObject = cameraStream;
        }
      }
      return true;
    } catch (error) {
      console.error('Error stopping screen sharing:', error);
      return false;
    }
  }

  endCall(stopLocalStream = true) {
    try {
      console.log(`Ending call, stopLocalStream=${stopLocalStream}`);
      
      // Close peer connection
      if (this.peerConnection) {
        console.log('Closing peer connection');
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // Stop local stream if requested
      if (stopLocalStream && this.localStream) {
        console.log('Stopping local stream tracks');
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      } else if (this.localStream) {
        console.log('Keeping local stream active for potential reconnection');
      }
      
      // Clear video elements
      if (this.localVideo && stopLocalStream) {
        this.localVideo.srcObject = null;
      }

      if (this.remoteVideo) {
        this.remoteVideo.srcObject = null;
      }
      
      // Update UI
      this.onCallEnded();
      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }
}

// Make available globally
window.WebRTCHandler = WebRTCHandler;
