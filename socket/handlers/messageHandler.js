//scocket/handlers/messageHandler.js
const { Message } = require('../../models/associations');

// This function is called by socket/index.js for each new connection
function registerMessageHandlers(io, socket, userSocketMap) {

  // === 1. HANDLE CUSTOMER MESSAGES (Customer -> Support) ===
  socket.on('customer_message', async (msg) => {
    console.log('BACKEND: Received "customer_message" from user:', socket.user.id);
    // msg = { text: "Hello!" }
    const customer = socket.user; // { id, role }

    try {
      // 1. Save to database
      const savedMessage = await Message.create({
        text: msg.text,
        fromUserId: customer.id,
        toUserId: null, // Null = message *to* support
        conversationId: customer.id // Group all messages by the customer's ID
      });

      // 2. Prepare the full message payload
      const messagePayload = {
        id: savedMessage.id, // From DB
        text: savedMessage.text,
        fromUserId: savedMessage.fromUserId,
        conversationId: savedMessage.conversationId,
        timestamp: savedMessage.createdAt,
      };

      // 3. Send to all connected staff/admins
      io.to('support_team').emit('new_customer_message', messagePayload);
      console.log('BACKEND: Sending "new_support_message" back to customer room:', `user_${customer.id}`);

      // 4. Send the message back to the customer's *own* socket
      socket.emit('new_support_message', messagePayload);
      
    } catch (err) {
      console.error("Error saving customer message:", err);
      // Optionally emit an error back to the customer
      socket.emit("chat_error", { message: "Could not send message." });
    }
  });

  // === 2. HANDLE SUPPORT MESSAGES (Support -> Customer) ===
  socket.on('support_message', async (msg) => {
    // msg = { text: "How can I help?", targetUserId: 12 }
    const staff = socket.user; // { id, role }

    try {
      // 1. Save to database
      const savedMessage = await Message.create({
        text: msg.text,
        fromUserId: staff.id,
        toUserId: msg.targetUserId,
        conversationId: msg.targetUserId // Group by customer's ID
      });
      
      // 2. Prepare the full message payload
      const messagePayload = {
        id: savedMessage.id,
        text: savedMessage.text,
        fromUserId: savedMessage.fromUserId,
        toUserId: savedMessage.toUserId,
        conversationId: savedMessage.conversationId,
        timestamp: savedMessage.createdAt,
        fromRole: staff.role
      };

      // 3. Send message *only* to the customer's private room
      const targetRoom = `user_${msg.targetUserId}`;
      io.to(targetRoom).emit('new_support_message', messagePayload);

      // 4. Send the message back to the *entire* support team
      // so other staff can see the reply.
      io.to('support_team').emit('new_support_message', messagePayload);
      
    } catch (err) {
      console.error("Error saving support message:", err);
      socket.emit("chat_error", { message: "Could not send message." });
    }
  });
}

module.exports = registerMessageHandlers;