const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const btnConnect = document.getElementById("connect");
const inputName = document.getElementById("name");
const inputRoom = document.getElementById("room");
const info = document.getElementById("info");
const client_status = document.getElementById("status");

let socket;
let myNumber = null; // ? I'm p1 or p2?
let config = null; // ? Game config from server
let playing = false; // ? Flag
let keys = {}; // ? Pressed keys

btnConnect.addEventListener("click", () => {
    const name = inputName.value.trim();
    const room = inputRoom.value.trim();

    if (!name || !room) {
        alert("Please enter your name and room");
        return;
    }

    socket = io();
    socket.emit("join_room", { name, room });
    btnConnect.disabled = true;
    client_status.textContent = `Connecting to room "${room}"...`;

    socket.on("assigned_player", (data) => {
        myNumber = data.number;
        config = data.config;
        info.textContent = `You are Player ${myNumber}`;
        client_status.textContent = "Waiting for the other player...";
    });

    socket.on("room_full", () => {
        alert("The room is full");
        btnConnect.disabled = false;
        client_status.textContent = "";
    });

    socket.on("start_game", (players) => {
        playing = true;
        info.style.display = "none";
        client_status.textContent = `${players[0].name} vs ${players[1].name}`;
    });

    socket.on("update_state", (gameState) => {
        draw(gameState);
    });

    socket.on("player_disconnected", () => {
        playing = false;
        info.style.display = "block";
        info.textContent = "The other player disconnected";
        client_status.textContent = "";
        btnConnect.disabled = false;
    });
});

// ? Controls
document.addEventListener("keydown", (e) => {
    if (!playing || !socket) return;
    if (e.key === "w" || e.key.toLowerCase() === "w") keys.up = true;
    if (e.key === "s" || e.key.toLowerCase() === "s") keys.down = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key.toLowerCase() === "w") keys.up = false;
    if (e.key === "s" || e.key.toLowerCase() === "s") keys.down = false;
});

setInterval(() => {
    if (!playing || !socket) return;
    if (keys.up) socket.emit("move_paddle", "up");
    if (keys.down) socket.emit("move_paddle", "down");
}, 1000 / 60);

function draw(gameState) {
    ctx.fillStyle = "#434343ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ? Center line
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // ? Scores
    ctx.fillStyle = "#e9e9e9ff";
    ctx.font = "36px Arial";
    ctx.fillText(gameState.p1.score, canvas.width / 4, 50);
    ctx.fillText(gameState.p2.score, 3 * canvas.width / 4, 50);

    // ? Paddles
    ctx.fillStyle = "#bb5889ff";
    ctx.fillRect(20, gameState.p1.y, config.paddleWidth, config.paddleHeight);
    ctx.fillStyle = "#3bffa7ff";
    ctx.fillRect(canvas.width - 20 - config.paddleWidth, gameState.p2.y, config.paddleWidth, config.paddleHeight);

    // ? Ball
    ctx.fillStyle = gameState.ball.last === 0
        ? "#e9e9e9ff"
        : gameState.ball.last === 1
            ? "#bb5889ff"
            : "#3bffa7ff";
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, config.ballSize / 2, 0, Math.PI * 2);
    ctx.fill();
}
