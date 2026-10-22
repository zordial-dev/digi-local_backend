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
      const vId = typeof vendorId === 'object' && vendorId !== null 
        ? (vendorId.vendor_id || vendorId.id || vendorId.vendorId) 
        : vendorId;
      if (vId) {
        socket.join(`vendor_${vId}`);
        socket.join(String(vId));
        console.log(`🔌 [SOCKET.IO] Vendor #${vId} joined real-time notification channel (rooms: vendor_${vId}, ${vId})`);
      }
    });

    socket.on('join_user_room', (userId) => {
      const uId = typeof userId === 'object' && userId !== null 
        ? (userId.user_id || userId.id || userId.userId) 
        : userId;
      if (uId) {
        socket.join(`user_${uId}`);
        socket.join(String(uId));
        console.log(`🔌 [SOCKET.IO] User #${uId} joined real-time channel (rooms: user_${uId}, ${uId})`);
      }
    });

    socket.on('join_order_room', (orderId) => {
      const oId = typeof orderId === 'object' && orderId !== null 
        ? (orderId.order_id || orderId.id || orderId.orderId) 
        : orderId;
      if (oId) {
        socket.join(`order_${oId}`);
        socket.join(String(oId));
        console.log(`🔌 [SOCKET.IO] Joined order tracking room (rooms: order_${oId}, ${oId})`);
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
