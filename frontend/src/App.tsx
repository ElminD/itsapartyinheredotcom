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
      setUsers((prev) => [...prev, u]);
      if (u.id === socket.id) setMe(u);
    });
    socket.on(
      "userMoved",
      ({ id, x, y }: { id: string; x: number; y: number }) => {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, x, y } : u)));
        if (id === socket.id && me) {
          setMe({ ...me, x, y });
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
      const step = 5;
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
        default:
          return;
      }
      socket.emit("move", { x, y });
      setMe({ ...me, x, y });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [me]);

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "#f0f0f0",
        }}
      >
        {/* Strobe overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            animation: "strobe 2.5s infinite",
          }}
        />

        {/* Party sign */}
        <h1 className="party-sign">itsapartyinhere</h1>

        {/* Avatars */}
        {me &&
          users.map((u) => {
            const screenX = u.x - me.x + center.x - AVATAR_SIZE / 2;
            const screenY = u.y - me.y + center.y - AVATAR_SIZE / 2;
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
          style={{ position: "absolute", bottom: 10, left: 800 }}
        >
          <source src="/songs/fred-again-boiler-room.mp3" type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
};

export default App;
