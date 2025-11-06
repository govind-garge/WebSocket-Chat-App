# 🧠 WebSocket Chat App (Node.js)

A simple **real-time private chat** built with Node.js and WebSocket — featuring:

✅ Message Delivery Status  
✍️ Typing Indicators  
🟢 Online Users List  

---

## 📦 Features

- Private messaging between logged-in users  
- Live typing indicator (“user is typing…”)  
- Delivery confirmation (“✅ Delivered”)  
- Online users auto-updated  
- Simple and clean frontend with HTML + JavaScript  
- No database required (runs entirely in-memory)

---

## ⚙️ Project Structure

```
project/
├── server.js
└── public/
    └── index.html
```

---

## 🚀 Setup Instructions

### 1. Initialize Project
```bash
mkdir websocket-chat
cd websocket-chat
npm init -y
npm install express ws
```

### 2. Add Files

#### server.js

```js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const users = new Map();

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

      if (msg.type === 'private_message') {
        const receiver = users.get(msg.to);
        if (receiver && receiver.readyState === WebSocket.OPEN) {
          receiver.send(JSON.stringify({
            type: 'private_message',
            from: ws.username,
            message: msg.message,
          }));

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
```

#### public/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chat with Delivery + Typing</title>
  <style>
    body {
      font-family: Arial;
      display: flex;
      justify-content: center;
      margin: 0;
    }
    #container {
      display: flex;
      width: 900px;
      height: 100vh;
      border: 1px solid #ccc;
    }
    #sidebar {
      width: 200px;
      border-right: 1px solid #ccc;
      padding: 10px;
      background: #f9f9f9;
      overflow-y: auto;
    }
    #chatArea {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 10px;
    }
    #chat {
      flex: 1;
      border: 1px solid #ccc;
      padding: 10px;
      overflow-y: auto;
      margin-bottom: 10px;
    }
    #typingStatus {
      font-style: italic;
      color: gray;
      margin-bottom: 5px;
    }
    input, button {
      padding: 8px;
      margin: 4px;
    }
    .user {
      cursor: pointer;
      padding: 4px;
    }
    .user:hover {
      background-color: #eee;
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="sidebar">
      <h3>🟢 Online Users</h3>
      <div id="users"></div>
    </div>

    <div id="chatArea">
      <div>
        <input id="username" placeholder="Enter username">
        <button id="loginBtn">Login</button>
      </div>

      <div id="chat"></div>
      <div id="typingStatus"></div>

      <div>
        <input id="toUser" placeholder="Send to (username)">
        <input id="message" placeholder="Type message...">
        <button id="sendBtn">Send</button>
      </div>
    </div>
  </div>

  <script>
    const socket = new WebSocket('ws://localhost:8080');
    const chat = document.getElementById('chat');
    const usersDiv = document.getElementById('users');
    const typingStatus = document.getElementById('typingStatus');
    let username = '';

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'system') {
        addMessage(`⚙️ ${msg.message}`, 'gray');
      }
      else if (msg.type === 'private_message') {
        addMessage(`📩 From ${msg.from}: ${msg.message}`);
        showTyping('');
      }
      else if (msg.type === 'user_list') {
        updateUserList(msg.users);
      }
      else if (msg.type === 'delivered') {
        addMessage(`✅ Delivered to ${msg.to}: ${msg.message}`, 'green');
      }
      else if (msg.type === 'typing') {
        showTyping(`${msg.from} is typing...`);
      }
    };

    document.getElementById('loginBtn').onclick = () => {
      username = document.getElementById('username').value.trim();
      if (username) {
        socket.send(JSON.stringify({ type: 'login', username }));
      }
    };

    document.getElementById('sendBtn').onclick = sendMessage;
    document.getElementById('message').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
      else sendTyping();
    });

    function sendMessage() {
      const to = document.getElementById('toUser').value.trim();
      const message = document.getElementById('message').value.trim();
      if (to && message) {
        socket.send(JSON.stringify({ type: 'private_message', to, message }));
        addMessage(`You → ${to}: ${message}`, 'blue');
        document.getElementById('message').value = '';
      }
    }

    function sendTyping() {
      const to = document.getElementById('toUser').value.trim();
      if (to) {
        socket.send(JSON.stringify({ type: 'typing', to }));
      }
    }

    function addMessage(text, color = 'black') {
      const div = document.createElement('div');
      div.textContent = text;
      div.style.color = color;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function showTyping(text) {
      typingStatus.textContent = text;
      if (text) {
        setTimeout(() => typingStatus.textContent = '', 2000);
      }
    }

    function updateUserList(usernames) {
      usersDiv.innerHTML = '';
      usernames.forEach(user => {
        const div = document.createElement('div');
        div.textContent = user;
        div.className = 'user';
        if (user === username) div.style.fontWeight = 'bold';
        div.onclick = () => {
          document.getElementById('toUser').value = user;
        };
        usersDiv.appendChild(div);
      });
    }
  </script>
</body>
</html>
```

---

## 🧪 How to Run

```bash
node server.js
```

Then open **http://localhost:8080** in two or more browser tabs.

- Login as your name 'user1' or user2
- Start typing → shows “user1 is typing…”
- Send message → sender user1 “✅ Delivered”

---

### 👨‍💻 Author

Created with ❤️ by **Govind Garge**