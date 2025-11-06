const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const users = new Map();

// Broadcast helper
function broadcast(data) {
  const message = JSON.stringify(data);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function updateUserList() {
  const usernames = Array.from(users.keys());
  broadcast({ type: 'user_list', users: usernames });
}

wss.on('connection', (ws) => {
  console.log('New connection...');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // 1️⃣ Login
      if (msg.type === 'login') {
        if (users.has(msg.username)) {
          ws.send(JSON.stringify({ type: 'system', message: 'Username already taken!' }));
          ws.close();
          return;
        }
        users.set(msg.username, ws);
        ws.username = msg.username;
        console.log(`✅ ${msg.username} logged in`);
        ws.send(JSON.stringify({ type: 'system', message: `Welcome, ${msg.username}!` }));
        updateUserList();
        return;
      }

      // 2️⃣ Private message
      if (msg.type === 'private_message') {
        const receiver = users.get(msg.to);
        if (receiver && receiver.readyState === WebSocket.OPEN) {
          // Send message to receiver
          receiver.send(JSON.stringify({
            type: 'private_message',
            from: ws.username,
            message: msg.message,
          }));

          // Send delivery status back to sender
          ws.send(JSON.stringify({
            type: 'delivered',
            to: msg.to,
            message: msg.message
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'system',
            message: `User ${msg.to} not available`
          }));
        }
      }

      // 3️⃣ Typing indicator
      if (msg.type === 'typing') {
        const receiver = users.get(msg.to);
        if (receiver && receiver.readyState === WebSocket.OPEN) {
          receiver.send(JSON.stringify({
            type: 'typing',
            from: ws.username,
          }));
        }
      }

    } catch (err) {
      console.error('Invalid message format:', err.message);
    }
  });

  ws.on('close', () => {
    if (ws.username) {
      users.delete(ws.username);
      console.log(`❌ ${ws.username} disconnected`);
      updateUserList();
    }
  });
});

const PORT = 8080;
server.listen(PORT, () =>
  console.log(`🚀 Chat server (with typing + delivery) running at http://localhost:${PORT}`)
);
