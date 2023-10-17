class Player {
    
    constructor(playerName,game,user) {
      this.idPlayer = null;
      this.idUser = user;
      this.name = playerName;
      this.game = game;
      this.target = null;
      this.number = null;
      this.mission = null;
      this.nbKill = 0;
      this.status = "life";
    }
    
    nbRandom() {
      this.number = Math.floor(Math.random() * 26 + 1);
    }
  }
  
  module.exports = Player;
  