export default class Room {
  constructor(players, state, playing = false) {
    this.players = players;
    this.state = state;
    this.playing = playing;
  }
}
