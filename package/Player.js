class Player {
    
    constructor(id,name) {
      this.idPlayer = id;
      this.name = name;
      this.target = null;
      this.number = null;
      this.mission = null;
    }
    
    nbRandom() {
      this.number = Math.floor(Math.random() * 26 + 1);
    }

  }
  
  module.exports = Player;
  