/**
 * WebRTC reconnection handler
 * Manages reconnection attempts and state for WebRTC connections
 */
class WebRTCReconnectHandler {
    constructor(webrtcHandler, options = {}) {
        this.webrtc = webrtcHandler;
        this.maxAttempts = options.maxAttempts || 5;
        this.attemptDelay = options.attemptDelay || 3000; // 2 seconds
        this.currentAttempt = 0;
        this.reconnectTimer = null;
        this.isReconnecting = false;
    }

    /**
     * Start reconnection process
     */
    startReconnect() {
        if (this.isReconnecting) {
            console.log('Reconnection already in progress');
            return;
        }

        this.isReconnecting = true;
        this.currentAttempt = 0;
        this.attemptReconnect();
    }

    /**
     * Stop reconnection attempts
     */
    stopReconnect() {
        this.isReconnecting = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.currentAttempt = 0;
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (!this.isReconnecting || this.currentAttempt >= this.maxAttempts) {
            if (this.currentAttempt >= this.maxAttempts) {
                console.log('Max reconnection attempts reached');
                this.webrtc.onReconnectFailed();
            }
            this.stopReconnect();
            return;
        }

        this.currentAttempt++;
        console.log(`Reconnection attempt ${this.currentAttempt}/${this.maxAttempts}`);

        // Clean up existing connection
        if (this.webrtc.peerConnection) {
            this.webrtc.peerConnection.close();
            this.webrtc.peerConnection = null;
        }

        // Create new peer connection
        const success = this.webrtc.createPeerConnection();
        if (!success) {
            console.error('Failed to create new peer connection');
            this.scheduleNextAttempt();
            return;
        }

        // If we're the initiator, create and send a new offer
        if (this.webrtc.isInitiator) {
            this.webrtc.createOffer().catch(error => {
                console.error('Error creating offer during reconnect:', error);
                this.scheduleNextAttempt();
            });
        }
    }

    /**
     * Schedule the next reconnection attempt
     */
    scheduleNextAttempt() {
        if (this.isReconnecting && this.currentAttempt < this.maxAttempts) {
            this.reconnectTimer = setTimeout(() => {
                this.attemptReconnect();
            }, this.attemptDelay);
        } else {
            this.stopReconnect();
        }
    }
}
