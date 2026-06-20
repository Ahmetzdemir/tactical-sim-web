type MessageCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private userId: string | null = null;
  private reconnectTimer: any = null;
  private messageQueue: string[] = [];
  private callbacks: Map<string, Set<MessageCallback>> = new Map();
  private connectionCallbacks: Set<(status: boolean) => void> = new Set();
  private reconnectDelay = 2000;
  private isManuallyClosed = false;

  constructor() {
    // Default to localhost:8080, but can be overridden by environment variable
    this.url = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8080';
  }

  public connect(userId: string) {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.userId = userId;
    this.isManuallyClosed = false;

    console.log(`Connecting to WebSocket server at ${this.url} for user ${userId}...`);

    try {
      this.socket = new WebSocket(this.url);
      this.setupHandlers();
    } catch (e) {
      console.error('WebSocket connection initialization failed:', e);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.isManuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public send(msg: any) {
    const payload = JSON.stringify(msg);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      console.warn('WebSocket not open. Queueing message:', msg.type);
      this.messageQueue.push(payload);
    }
  }

  public on(type: string, callback: MessageCallback) {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, new Set());
    }
    this.callbacks.get(type)!.add(callback);
  }

  public off(type: string, callback: MessageCallback) {
    if (this.callbacks.has(type)) {
      this.callbacks.get(type)!.delete(callback);
    }
  }

  public onConnectionChange(callback: (isConnected: boolean) => void) {
    this.connectionCallbacks.add(callback);
    // Initial status
    callback(this.isConnected());
  }

  public offConnectionChange(callback: (isConnected: boolean) => void) {
    this.connectionCallbacks.delete(callback);
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private setupHandlers() {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('WebSocket connection opened successfully.');
      this.reconnectDelay = 2000; // Reset reconnect delay

      // Authenticate/init immediately on connection open
      this.send({
        type: 'INIT',
        userId: this.userId
      });

      // Flush queue
      while (this.messageQueue.length > 0) {
        const payload = this.messageQueue.shift();
        if (payload && this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(payload);
        }
      }

      this.notifyConnectionCallbacks(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`WebSocket received message: ${data.type}`, data);

        const handlers = this.callbacks.get(data.type);
        if (handlers) {
          handlers.forEach(cb => {
            try { cb(data); } catch (err) { console.error('Error in message callback:', err); }
          });
        }
      } catch (err) {
        console.error('Error parsing WebSocket message content:', err);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket connection closed. Code: ${event.code}. Clean: ${event.wasClean}`);
      this.notifyConnectionCallbacks(false);

      if (!this.isManuallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket connection error observed:', err);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    console.log(`Scheduling reconnect in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.userId && !this.isManuallyClosed) {
        // Double reconnection delay up to 15 seconds
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15000);
        this.connect(this.userId);
      }
    }, this.reconnectDelay);
  }

  private notifyConnectionCallbacks(isConnected: boolean) {
    this.connectionCallbacks.forEach(cb => cb(isConnected));
  }
}

export const webSocketService = new WebSocketService();
