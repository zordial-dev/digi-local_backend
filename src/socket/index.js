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

    socket.on('disconnect', () => {});
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
