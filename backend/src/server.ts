import express from "express";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";

interface User {
  id: string;
  name: string;
  avatarUrl: string;
  x: number;
  y: number;
}

const AVATARS = [
  "https://emojis.slackmojis.com/emojis/images/1643516033/20573/kirby_jam.gif?1643516033",
  "https://emojis.slackmojis.com/emojis/images/1643514525/5197/party_blob.gif?1643514525",
  "https://emojis.slackmojis.com/emojis/images/1643514596/5999/meow_party.gif?1643514596",
  "https://emojis.slackmojis.com/emojis/images/1643514670/6723/hyperfastparrot.gif?1643514670",
  "https://emojis.slackmojis.com/emojis/images/1643515386/14043/dino_dance.gif?1643515386",
  "https://emojis.slackmojis.com/emojis/images/1677311855/64344/party-on.gif?1677311855",
];

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = new Map<string, User>();

// Serve React static build
// Assumes you copied frontend/build -> backend/build
const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));
// For any other route, serve index.html
app.use((_req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

io.on("connection", (socket: Socket) => {
  // 1) New user joins, send them current state
  socket.emit("initialUsers", Array.from(users.values()));

  // 2) Listen for the join event with name payload
  socket.on("join", (name: string) => {
    const avatarUrl = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const newUser: User = {
      id: socket.id,
      name,
      avatarUrl,
      x: 100, // default start
      y: 100,
    };
    users.set(socket.id, newUser);
    io.emit("newUser", newUser);
  });

  // 3) Movement
  socket.on("move", (pos: { x: number; y: number }) => {
    const u = users.get(socket.id);
    if (!u) return;
    u.x = pos.x;
    u.y = pos.y;
    io.emit("userMoved", { id: socket.id, x: u.x, y: u.y });
  });

  // 4) Disconnect
  socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("userDisconnected", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
