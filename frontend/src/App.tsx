import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// Define User shape
type User = {
  id: string;
  name: string;
  avatarUrl: string;
  x: number;
  y: number;
};

// Initialize socket
const socket: Socket = io();

// Avatar display size
const AVATAR_SIZE = 50;

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [center, setCenter] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  // Track viewport center for camera
  useEffect(() => {
    const handleResize = () =>
      setCenter({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Join once on connect and setup socket listeners
  useEffect(() => {
    socket.once("connect", () => {
      const name = prompt("Enter your display name:") || "Anonymous";
      socket.emit("join", name);
    });

    socket.on("initialUsers", (initial: User[]) => setUsers(initial));
    socket.on("newUser", (u: User) => {
      setUsers((prev) => prev.some(user => user.id === u.id) ? prev : [...prev, u]);
      if (u.id === socket.id) setMe(u);
    });

    socket.on(
      "userMoved",
      ({ id, x, y, avatarUrl }: { id: string; x: number; y: number; avatarUrl?: string }) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, x, y, ...(avatarUrl ? { avatarUrl } : {}) }
              : u
          )
        );
        if (id === socket.id && me) {
          setMe({ ...me, x, y, ...(avatarUrl ? { avatarUrl } : {}) });
        }
      }
    );

    socket.on("userDisconnected", (id: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    });

    return () => {
      socket.off("connect");
      socket.off("initialUsers");
      socket.off("newUser");
      socket.off("userMoved");
      socket.off("userDisconnected");
    };
  }, [me]);
  
  

  // Handle movement via arrow keys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!me) return;
      let { x, y } = me;
      const step = 10;
      switch (e.key) {
        case "ArrowUp":
          y -= step;
          break;
        case "ArrowDown":
          y += step;
          break;
        case "ArrowLeft":
          x -= step;
          break;
        case "ArrowRight":
          x += step;
          break;
        case "c":
        case "C":
          socket.emit("changeAvatar");
          return;
        default:
          return;
      }
      // Clamp to bounds (stay fully inside the image)
      x = Math.max(0, Math.min(1217, x));
      y = Math.max(0, Math.min(768, y));
      socket.emit("move", { x, y });
      setMe({ ...me, x, y });
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [me]);


  return (
    <div className="app-outer-bg">
      <div className="nightclub-bg">
        {/* Strobe overlay */}
        <div className="strobe-overlay" />
  
        {/* Party sign */}
        <h1 className="party-sign">itsapartyinhere</h1>
        <h2 className="party-instructions">arrow keys to move, c to change</h2>
  
        {/* Avatars */}
        {me &&
          users.map((u) => {
            // Camera logic: clamp center so you can't see outside the image
            const halfW = 1217 / 2;
            const halfH = 768 / 2;
            let camX = me.x;
            let camY = me.y;
            camX = Math.max(halfW, Math.min(1217 - halfW, camX));
            camY = Math.max(halfH, Math.min(768 - halfH, camY));
            const screenX = u.x - camX + halfW - AVATAR_SIZE / 2;
            const screenY = u.y - camY + halfH - AVATAR_SIZE / 2;
            return (
              <div
                key={u.id}
                style={{
                  position: "absolute",
                  left: screenX,
                  top: screenY,
                  textAlign: "center",
                }}
              >
                <img
                  src={u.avatarUrl}
                  alt={u.name}
                  width={AVATAR_SIZE}
                  height={AVATAR_SIZE}
                  style={{ display: "block" }}
                />
                <span
                  style={{
                    display: "block",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    padding: "2px 4px",
                    borderRadius: "3px",
                    marginTop: "2px",
                    fontSize: "12px",
                  }}
                >
                  {u.name}
                </span>
              </div>
            );
          })}
  
        {/* Playlist audio controls */}
        <audio
          controls
          autoPlay={false}
          loop={true}
          style={{ position: "absolute", bottom: 10, left: 400 }}
        >
          <source src="/songs/fred-again-boiler-room.mp3" type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
};

export default App;
