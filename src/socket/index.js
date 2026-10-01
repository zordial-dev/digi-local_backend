const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_vendor_room', (vendorId) => {
      if (vendorId) {
        socket.join(`vendor_${vendorId}`);
        socket.join(String(vendorId));
        console.log(`🔌 [SOCKET.IO] Vendor #${vendorId} joined real-time notification channel (rooms: vendor_${vendorId}, ${vendorId})`);
      }
    });

    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        socket.join(String(userId));
        console.log(`🔌 [SOCKET.IO] User #${userId} joined real-time channel (rooms: user_${userId}, ${userId})`);
      }
    });

    socket.on('join_order_room', (orderId) => {
      if (orderId) {
        socket.join(`order_${orderId}`);
        socket.join(String(orderId));
        console.log(`🔌 [SOCKET.IO] Joined order tracking room (rooms: order_${orderId}, ${orderId})`);
      }
    });

    socket.on('disconnect', () => { });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  getIO
};
