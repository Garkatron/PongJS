export default class Player {
  constructor({
    y = 0,
    arenaHeight,
    paddleHeight = 100,
    speed = 0,
    score = 0
  }) {
    this.y = y;
    this.arenaHeight = arenaHeight;
    this.paddleHeight = paddleHeight;
    this.speed = speed;
    this.score = score;
  }

  setSpeed(speed) {
    this.speed = speed;
    return this;
  }

  setPaddleHeight(paddleHeight) {
    this.paddleHeight = paddleHeight;
    return this;
  }

  move(direction) {
    if (direction === 'up') {
      this.y = Math.max(0, this.y - this.speed);
    } else if (direction === 'down') {
      this.y = Math.min(
        this.arenaHeight - this.paddleHeight,
        this.y + this.speed
      );
    }
  }
}
