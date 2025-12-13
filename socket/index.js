// In socket/index.js
const { Server } = require("socket.io");
const socketAuth = require("./middleware");
const registerMessageHandlers = require("./handlers/messageHandler");

const userSocketMap = new Map(); // Tracks { userId: socketId }

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // 1. ATTACH THE AUTH MIDDLEWARE
  // This runs *first* for every new connection.
  socketAuth(io);

  // 2. --- THIS IS THE MISSING PIECE ---
  //    HANDLE THE 'connection' EVENT (runs *after* auth is successful)
  io.on('connection', (socket) => {
    // 'socket.user' was attached by our socketAuth middleware
    const user = socket.user;
    console.log(`Socket connected: ${socket.id}, User: ${user.id}, Role: ${user.role}`);

    // === A. HANDLE ROOM JOINING ===
    
    // Store this user's socket ID
    userSocketMap.set(user.id, socket.id);
    
    if (user.role === 'customer') {
      // Customers join their own private room
      socket.join(`user_${user.id}`);
      console.log(`User ${user.id} joined room 'user_${user.id}'`);
    } else if (user.role === 'staff' || user.role === 'admin') {
      // Staff/Admins join the shared support room
      socket.join('support_team');
      console.log(`User ${user.id} joined room 'support_team'`);
    }

    // === B. REGISTER EVENT HANDLERS ===
    // Pass the connection to our message handler
    registerMessageHandlers(io, socket, userSocketMap);

    // === C. HANDLE DISCONNECT ===
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}, User: ${user.id}`);
      // Remove user from our tracking map
      if (userSocketMap.get(user.id) === socket.id) {
        userSocketMap.delete(user.id);
      }
    });
  });
  // --- END OF MISSING PIECE ---

  io.userSocketMap = userSocketMap; // For other files, if needed
  return io;
}

module.exports = { initializeSocket, userSocketMap };