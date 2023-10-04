class Player {
    
    constructor(name) {
      this.name = name;
      this.cible = null;
      this.number = null;
      this.mission = null;
    }
    
    nbRandom() {
      this.number = Math.floor(Math.random() * 26 + 1);
    }
  }
  
  module.exports = Player;
  