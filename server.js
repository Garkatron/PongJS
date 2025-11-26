// * Server
import express from 'express';
import httpModule from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// * Game
import Ball from './src/Ball.js';
import Player from './src/Player.js';
import State from './src/State.js';
import Room from './src/Room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const http = httpModule.createServer(app);
const io = new SocketIO(http);

// * Game config
const SERVER_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, './config/server_config.json'), 'utf-8'));
const GAME_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, './config/game_config.json'), 'utf-8'));

// ? Serve Client
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ? Connection logic
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ name, room }) => {
    if (!rooms[room]) {

      const ball = new Ball({
        x: GAME_CONFIG.width / 2,
        y: GAME_CONFIG.height / 2,
        speed: GAME_CONFIG.ballSpeed,
        arenaWidth: GAME_CONFIG.width,
        arenaHeight: GAME_CONFIG.height
      });

      // * P1
      const player1 = new Player({
        y: GAME_CONFIG.height / 2,
        arenaHeight: GAME_CONFIG.height
      })
        .setSpeed(GAME_CONFIG.paddleSpeed)
        .setPaddleHeight(GAME_CONFIG.paddleHeight);

      // * P2
      const player2 = new Player({
        y: GAME_CONFIG.height / 2,
        arenaHeight: GAME_CONFIG.height
      })
        .setSpeed(GAME_CONFIG.paddleSpeed)
        .setPaddleHeight(GAME_CONFIG.paddleHeight);

      const state = new State(ball, player1, player2);
      rooms[room] = new Room([], state, false);
    }

    const currentRoom = rooms[room];

    if (currentRoom.players.length >= 2) {
      socket.emit('room_full');
      return;
    }

    const playerNumber = currentRoom.players.length + 1;

    // ? Adding player to room.
    currentRoom.players.push({
      id: socket.id,
      name,
      number: playerNumber
    });

    socket.join(room);
    socket.room = room;
    socket.playerNumber = playerNumber;

    console.log(`${name} joined room ${room} as player ${playerNumber}`);

    socket.emit('assigned_player', { number: playerNumber, config: GAME_CONFIG });

    if (currentRoom.players.length === 2) {
      currentRoom.playing = true;
      io.to(room).emit('start_game', currentRoom.players);
      startGameLoop(room);
    }
  });

  // ? Game Signals
  socket.on('move_paddle', (direction) => {
    if (!socket.room || !socket.playerNumber) return;

    const currentRoom = rooms[socket.room];
    if (!currentRoom || !currentRoom.playing) return;

    const player = socket.playerNumber === 1 ? currentRoom.state.p1 : currentRoom.state.p2;

    player.move(direction);

  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    if (socket.room) {
      const currentRoom = rooms[socket.room];
      if (currentRoom) {
        currentRoom.playing = false;
        currentRoom.players = currentRoom.players.filter(p => p.id !== socket.id);

        if (currentRoom.players.length === 0) {
          delete rooms[socket.room];
        } else {
          io.to(socket.room).emit('player_disconnected');
        }
      }
    }
  });
});

// ? Game logic
function startGameLoop(room) {
  const currentRoom = rooms[room];
  if (!currentRoom) return;

  const interval = setInterval(() => {
    if (!currentRoom.playing || currentRoom.players.length < 2) {
      clearInterval(interval);
      return;
    }

    updateGame(currentRoom);
    io.to(room).emit('update_state', currentRoom.state);
  }, 1000 / 60);
}

// ? Game Logic
function updateGame(room) {
  const { ball, p1, p2 } = room.state;

  ball.update();

  if (ball.y <= 0 || ball.y >= GAME_CONFIG.height - GAME_CONFIG.ballSize) {
    ball.dy *= -1
  }

  // ? Player 1 hit
  if (ball.x <= 20 + GAME_CONFIG.paddleWidth &&
    ball.y >= p1.y &&
    ball.y <= p1.y + GAME_CONFIG.paddleHeight) {

    ball.last = 1;
    ball.dx = Math.abs(ball.dx)
  }

  // ? Player 2 hit
  if (ball.x >= GAME_CONFIG.width - 20 - GAME_CONFIG.paddleWidth - GAME_CONFIG.ballSize &&
    ball.y >= p2.y &&
    ball.y <= p2.y + GAME_CONFIG.paddleHeight) {
    ball.last = 2;
    ball.dx = -Math.abs(ball.dx)
  }

  if (ball.x <= 0) {
    p2.score++;
    ball.reset();
  } else if (ball.x >= GAME_CONFIG.width) {
    p1.score++;
    ball.reset();
  }

}

http.listen(SERVER_CONFIG.port, () => {
  console.log(`Server running on http://localhost:${SERVER_CONFIG.port}`);
});
