class Player {
    
    constructor(id,name) {
      this.idPlayer = id;
      this.game = null;
      this.name = name;
      this.target = null;
      this.number = null;
      this.mission = null;
      this.nbKill = 0;
    }
    
    nbRandom() {
      this.number = Math.floor(Math.random() * 26 + 1);
    }

  }
  
  module.exports = Player;
  