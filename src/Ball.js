export default class Ball {
  constructor({
    x,
    y,
    speed,
    arenaWidth,
    arenaHeight
  }) {
    this.x = x;
    this.y = y;
    this.speed = speed;

    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;

    this.dx = this.randomDir();
    this.dy = this.randomDir();

    this.last = 0; // ? The last player who touched it.
  }

  randomDir() {
    return this.speed * (Math.random() > 0.5 ? 1 : -1);
  }

  setSpeed(speed) {
    this.speed = speed;
    return this;
  }

  reset() {
    this.x = this.arenaWidth / 2;
    this.y = this.arenaHeight / 2;

    this.dx = this.randomDir();
    this.dy = this.randomDir();

    this.last = 0;
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
  }
}
