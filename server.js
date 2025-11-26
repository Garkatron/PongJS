import express from 'express';
import httpModule from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Importar clases
import Ball from './Ball.js';
import Player from './Player.js';
import State from './State.js';
import Room from './Room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const http = httpModule.createServer(app);
const io = new SocketIO(http);

const SERVER_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'server_config.json'), 'utf-8'));
const GAME_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json'), 'utf-8'));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ name, room }) => {
    if (!rooms[room]) {
      const ball = new Ball(
        GAME_CONFIG.width / 2,
        GAME_CONFIG.height / 2,
        GAME_CONFIG.ballSpeed,
        GAME_CONFIG.ballSpeed
      );

      const player1 = new Player(GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2, 0);
      const player2 = new Player(GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2, 0);

      const state = new State(ball, player1, player2);
      rooms[room] = new Room([], state, false);
    }

    const currentRoom = rooms[room];

    if (currentRoom.players.length >= 2) {
      socket.emit('room_full');
      return;
    }

    const playerNumber = currentRoom.players.length + 1;
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

  socket.on('move_paddle', (direction) => {
    if (!socket.room || !socket.playerNumber) return;

    const currentRoom = rooms[socket.room];
    if (!currentRoom || !currentRoom.playing) return;

    const player = socket.playerNumber === 1 ? currentRoom.state.p1 : currentRoom.state.p2;

    if (direction === 'up') {
      player.y = Math.max(0, player.y - GAME_CONFIG.paddleSpeed);
    } else if (direction === 'down') {
      player.y = Math.min(GAME_CONFIG.height - GAME_CONFIG.paddleHeight, player.y + GAME_CONFIG.paddleSpeed);
    }
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

function updateGame(room) {
  const { ball, p1, p2 } = room.state;

  ball.x += ball.dx;
  ball.y += ball.dy;

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
    resetBall(ball);
  } else if (ball.x >= GAME_CONFIG.width) {
    p1.score++;
    resetBall(ball);
  }
}

function resetBall(ball) {
  ball.x = GAME_CONFIG.width / 2;
  ball.y = GAME_CONFIG.height / 2;
  ball.dx = GAME_CONFIG.ballSpeed * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = GAME_CONFIG.ballSpeed * (Math.random() > 0.5 ? 1 : -1);
  ball.last = 0;
}

http.listen(SERVER_CONFIG.port, () => {
  console.log(`Server running on http://localhost:${SERVER_CONFIG.port}`);
});
