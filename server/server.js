import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';

const PORT = process.env.PORT || 8080;

// Allowed origins for CORS (add your Vercel domain here after deploy)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://tactical-sim-web.vercel.app'
];

// HTTP server for health checks (Railway needs this)
const httpServer = createServer((req, res) => {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      rooms: rooms.size,
      connections: userSockets.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket server attaches to HTTP server
const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: (info) => {
    // In production, verify origin
    const origin = info.origin || info.req.headers.origin;
    if (process.env.NODE_ENV === 'production' && origin) {
      return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
    }
    return true; // Allow all in development
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Tactical Sim Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

// State managers
const rooms = new Map();             // roomId -> roomData
const userRooms = new Map();         // userId -> roomId
const userSockets = new Map();       // userId -> ws socket
const disconnectTimeouts = new Map(); // userId -> setTimeout

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomId() {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

// Send helper
function sendTo(ws, message) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

// Broadcast to room
function broadcastToRoom(roomId, excludeUserId, message) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.host && room.host !== excludeUserId) {
    const hostWs = userSockets.get(room.host);
    sendTo(hostWs, message);
  }
  if (room.guest && room.guest !== excludeUserId) {
    const guestWs = userSockets.get(room.guest);
    sendTo(guestWs, message);
  }
}

// Cleanup room when a user leaves permanently
function cleanupUserRoom(userId) {
  const roomId = userRooms.get(userId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) {
    userRooms.delete(userId);
    return;
  }

  console.log(`Cleaning up user ${userId} from room ${roomId}`);

  if (room.host === userId) {
    // Host left permanently -> delete room and alert guest
    broadcastToRoom(roomId, userId, { type: 'OPPONENT_LEFT', message: 'Sunucu sahibi oyundan ayrıldı.' });
    if (room.guest) {
      userRooms.delete(room.guest);
    }
    rooms.delete(roomId);
    userRooms.delete(userId);
  } else if (room.guest === userId) {
    // Guest left permanently -> clear guest and set status back to waiting
    room.guest = null;
    room.status = 'waiting';
    // Clean up draft states if applicable
    if (room.gameState) {
      room.gameState.guestReady = false;
    }
    broadcastToRoom(roomId, userId, { 
      type: 'ROOM_UPDATED', 
      room: {
        host: room.host,
        guest: null,
        status: 'waiting',
        type: room.type,
        roomId: roomId
      }
    });
    userRooms.delete(userId);
  }
}

wss.on('connection', (ws) => {
  let authenticatedUserId = null;

  console.log('New client connection initiated.');

  ws.on('message', (messageStr) => {
    try {
      const msg = JSON.parse(messageStr);
      
      switch (msg.type) {
        case 'INIT': {
          const userId = msg.userId || uuidv4();
          authenticatedUserId = userId;
          userSockets.set(userId, ws);

          console.log(`Client authenticated: ${userId}`);

          // Clear any active disconnect timeout for this user (successful reconnection)
          if (disconnectTimeouts.has(userId)) {
            console.log(`User ${userId} reconnected within window. Restoring session.`);
            clearTimeout(disconnectTimeouts.get(userId));
            disconnectTimeouts.delete(userId);

            // Notify user of successful reconnection and send current state
            const roomId = userRooms.get(userId);
            if (roomId) {
              const room = rooms.get(roomId);
              if (room) {
                sendTo(ws, {
                  type: 'RECONNECTED',
                  userId,
                  roomId,
                  room: {
                    host: room.host,
                    guest: room.guest,
                    status: room.status,
                    type: room.type,
                    roomId: roomId
                  },
                  gameState: room.gameState
                });
                // Alert the other player that they are back
                broadcastToRoom(roomId, userId, { type: 'OPPONENT_RECONNECTED' });
                return;
              }
            }
          }

          sendTo(ws, { type: 'INIT_SUCCESS', userId });
          break;
        }

        case 'CREATE_ROOM': {
          if (!authenticatedUserId) return;
          
          const roomId = generateRoomId();
          const roomData = {
            host: authenticatedUserId,
            guest: null,
            status: 'waiting',
            type: msg.roomType || 'battle',
            createdAt: Date.now(),
            gameState: null
          };

          rooms.set(roomId, roomData);
          userRooms.set(authenticatedUserId, roomId);

          console.log(`Room created: ${roomId} by host ${authenticatedUserId}`);

          sendTo(ws, {
            type: 'ROOM_CREATED',
            roomId,
            room: roomData
          });
          break;
        }

        case 'JOIN_ROOM': {
          if (!authenticatedUserId) return;
          const roomId = msg.roomId?.toUpperCase();
          const room = rooms.get(roomId);

          if (!room) {
            sendTo(ws, { type: 'ERROR', message: 'Oda bulunamadı!' });
            return;
          }

          if (room.host === authenticatedUserId) {
            // Already the host, rejoin or update
            userRooms.set(authenticatedUserId, roomId);
            sendTo(ws, { type: 'ROOM_JOINED', roomId, room });
            return;
          }

          if (room.guest && room.guest !== authenticatedUserId) {
            sendTo(ws, { type: 'ERROR', message: 'Oda dolu!' });
            return;
          }

          room.guest = authenticatedUserId;
          room.status = 'active';
          userRooms.set(authenticatedUserId, roomId);

          console.log(`User ${authenticatedUserId} joined room ${roomId}`);

          // Send confirmation to guest
          sendTo(ws, { type: 'ROOM_JOINED', roomId, room });

          // Notify host
          const hostWs = userSockets.get(room.host);
          sendTo(hostWs, {
            type: 'ROOM_UPDATED',
            room
          });
          break;
        }

        case 'MATCHMAKE': {
          if (!authenticatedUserId) return;
          const roomType = msg.roomType || 'battle';

          // Try to find a waiting room
          let foundRoomId = null;
          for (const [id, r] of rooms.entries()) {
            if (r.status === 'waiting' && r.host !== authenticatedUserId && r.type === roomType) {
              foundRoomId = id;
              break;
            }
          }

          if (foundRoomId) {
            const room = rooms.get(foundRoomId);
            room.guest = authenticatedUserId;
            room.status = 'active';
            userRooms.set(authenticatedUserId, foundRoomId);

            console.log(`Matchmaking: User ${authenticatedUserId} paired with room ${foundRoomId}`);

            sendTo(ws, { type: 'ROOM_JOINED', roomId: foundRoomId, room });
            broadcastToRoom(foundRoomId, authenticatedUserId, { type: 'ROOM_UPDATED', room });
          } else {
            // Create a room as host
            const roomId = generateRoomId();
            const roomData = {
              host: authenticatedUserId,
              guest: null,
              status: 'waiting',
              type: roomType,
              createdAt: Date.now(),
              gameState: null
            };

            rooms.set(roomId, roomData);
            userRooms.set(authenticatedUserId, roomId);

            console.log(`Matchmaking: No waiting rooms. Created ${roomId} for ${authenticatedUserId}`);

            sendTo(ws, { type: 'ROOM_CREATED', roomId, room: roomData });
          }
          break;
        }

        case 'GAME_STATE_UPDATE': {
          if (!authenticatedUserId) return;
          const roomId = userRooms.get(authenticatedUserId);
          const room = rooms.get(roomId);

          if (!room) return;

          // Merge updates to preserve opponent's independent fields (matching client store logic)
          const current = room.gameState || {};
          const update = msg.gameState;

          // Host / Guest checks to prevent ready-status stomp
          if (update.hostReady === false && update.guestReady === false) {
            // Both are resetting
            current.hostReady = false;
            current.guestReady = false;
          } else {
            if (authenticatedUserId === room.host) {
              if (update.hostReady !== undefined) current.hostReady = update.hostReady;
            } else {
              if (update.guestReady !== undefined) current.guestReady = update.guestReady;
            }
          }

          if (authenticatedUserId === room.host) {
            if (update.hostBudget !== undefined) current.hostBudget = update.hostBudget;
            if (update.hostDraftedRoles !== undefined) current.hostDraftedRoles = update.hostDraftedRoles;
          } else {
            if (update.guestBudget !== undefined) current.guestBudget = update.guestBudget;
            if (update.guestDraftedRoles !== undefined) current.guestDraftedRoles = update.guestDraftedRoles;
          }

          // Merge all other standard engine fields
          Object.keys(update).forEach((key) => {
            if (
              key !== 'hostReady' && key !== 'guestReady' &&
              key !== 'hostBudget' && key !== 'guestBudget' &&
              key !== 'hostDraftedRoles' && key !== 'guestDraftedRoles'
            ) {
              current[key] = update[key];
            }
          });

          room.gameState = current;

          // Broadcast the complete updated state to both players
          broadcastToRoom(roomId, null, {
            type: 'GAME_STATE_SYNC',
            gameState: current
          });
          break;
        }

        case 'LEAVE_ROOM': {
          if (!authenticatedUserId) return;
          cleanupUserRoom(authenticatedUserId);
          sendTo(ws, { type: 'LEFT_ROOM' });
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    if (!authenticatedUserId) return;
    userSockets.delete(authenticatedUserId);

    console.log(`Connection closed for user ${authenticatedUserId}.`);

    // Start reconnection window
    const roomId = userRooms.get(authenticatedUserId);
    if (roomId) {
      // Alert the other player that opponent disconnected temporarily
      broadcastToRoom(roomId, authenticatedUserId, { type: 'OPPONENT_DISCONNECTED', timeout: 60 });

      const timeout = setTimeout(() => {
        console.log(`Reconnection window expired for user ${authenticatedUserId}. Cleaning up.`);
        disconnectTimeouts.delete(authenticatedUserId);
        cleanupUserRoom(authenticatedUserId);
      }, 60000);

      disconnectTimeouts.set(authenticatedUserId, timeout);
    }
  });
});
