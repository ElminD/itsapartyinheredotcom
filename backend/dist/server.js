"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const AVATARS = [
    "https://emojis.slackmojis.com/emojis/images/1643516033/20573/kirby_jam.gif?1643516033",
    "https://emojis.slackmojis.com/emojis/images/1643514525/5197/party_blob.gif?1643514525",
    "https://emojis.slackmojis.com/emojis/images/1643514596/5999/meow_party.gif?1643514596",
    "https://emojis.slackmojis.com/emojis/images/1643514670/6723/hyperfastparrot.gif?1643514670",
    "https://emojis.slackmojis.com/emojis/images/1643515386/14043/dino_dance.gif?1643515386",
    "https://emojis.slackmojis.com/emojis/images/1677311855/64344/party-on.gif?1677311855",
];
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
const users = new Map();
// Serve React static build
const buildPath = path_1.default.join(__dirname, "..", "build");
app.use(express_1.default.static(buildPath));
app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/socket.io")) {
        return res.sendFile(path_1.default.join(buildPath, "index.html"));
    }
    next();
});
// Dance floor corners (inset for margin)
const DANCE_FLOOR = [
    { x: 340, y: 490 }, // top-left (inset)
    { x: 885, y: 490 }, // top-right (inset)
    { x: 935, y: 770 }, // bottom-right (inset)
    { x: 280, y: 770 }, // bottom-left (inset)
];
// Helper: random point in triangle
function randomPointInTriangle(A, B, C) {
    let r1 = Math.random();
    let r2 = Math.random();
    if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
    }
    const x = A.x + r1 * (B.x - A.x) + r2 * (C.x - A.x);
    const y = A.y + r1 * (B.y - A.y) + r2 * (C.y - A.y);
    return { x, y };
}
// Helper: random point in quad (split into two triangles)
function randomPointInQuad(quad) {
    // Triangle 1: 0-1-2, Triangle 2: 0-2-3
    if (Math.random() < 0.5) {
        return randomPointInTriangle(quad[0], quad[1], quad[2]);
    }
    else {
        return randomPointInTriangle(quad[0], quad[2], quad[3]);
    }
}
io.on("connection", (socket) => {
    socket.emit("initialUsers", Array.from(users.values()));
    socket.on("join", (name) => {
        const avatarUrl = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        const { x, y } = randomPointInQuad(DANCE_FLOOR);
        const newUser = {
            id: socket.id,
            name,
            avatarUrl,
            x: Math.round(x),
            y: Math.round(y),
        };
        users.set(socket.id, newUser);
        io.emit("newUser", newUser);
    });
    socket.on("move", (pos) => {
        const u = users.get(socket.id);
        if (!u)
            return;
        u.x = Math.max(0, Math.min(1217, pos.x));
        u.y = Math.max(0, Math.min(768, pos.y));
        io.emit("userMoved", { id: socket.id, x: u.x, y: u.y });
    });
    // 3) Change avatar
    socket.on("changeAvatar", () => {
        const u = users.get(socket.id);
        if (!u)
            return;
        // Pick a new avatar different from the current one
        let newAvatar;
        do {
            newAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        } while (newAvatar === u.avatarUrl && AVATARS.length > 1);
        u.avatarUrl = newAvatar;
        io.emit("userMoved", { id: socket.id, x: u.x, y: u.y, avatarUrl: u.avatarUrl });
    });
    socket.on("disconnect", () => {
        users.delete(socket.id);
        io.emit("userDisconnected", socket.id);
    });
});
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
