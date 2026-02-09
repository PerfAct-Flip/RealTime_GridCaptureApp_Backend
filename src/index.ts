import "dotenv/config";
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import type { CellOwner, JoinPayload, CapturePayload } from "./types.js";

const PORT = process.env.PORT || 3001;
const GRID_SIZE = 60;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const app = express();
app.use(cors());

const server = http.createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "../grid_state.json");

const loadGrid = (): CellOwner[] => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load grid state:", err);
  }
  return Array(TOTAL_CELLS).fill(null);
};

const saveGrid = (state: CellOwner[]) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save grid state:", err);
  }
};

const grid: CellOwner[] = loadGrid();

const getLeaderboard = () => {
  const counts: Record<string, { username: string; color: string; count: number }> = {};
  grid.forEach((cell) => {
    if (cell) {
      const username = cell.username;
      if (!counts[username]) {
        counts[username] = { username: cell.username, color: cell.color, count: 0 };
      }
      counts[username]!.count++;
    }
  });
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};


io.on("connection", (socket: Socket) => {
  socket.data = {};

  socket.on("join", ({ username, color }: JoinPayload) => {
    socket.data.username = username || "Anonymous";
    socket.data.color = color || "#888888";

    socket.emit("grid:init", grid);
    socket.emit("leaderboard:update", getLeaderboard());
  });

  socket.on("capture", ({ cellId }: CapturePayload) => {
    if (!socket.data.username) return;

    if (cellId < 0 || cellId >= TOTAL_CELLS) return;
    if (grid[cellId] !== null) return;

    const owner = {
      username: socket.data.username,
      color: socket.data.color,
      timestamp: Date.now(),
    };

    grid[cellId] = owner;
    io.emit("grid:update", { cellId, owner });
    io.emit("leaderboard:update", getLeaderboard());
    saveGrid(grid);
  });
});

app.get("/", (_, res) => {
  res.send("Real-time Grid Server Running (TS)");
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
