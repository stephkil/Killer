class Player {
    
    constructor() {
      this.idPlayer = null;
      this.idUser = null;
      this.name = null;
      this.game = null;
      this.target = null;
      this.mission = null;
      this.nbKill = 0;
      this.status = "life";
    }
    
    nbRandom() {
      let number = Math.floor(Math.random() * 26 + 1);
      
      this.mission = "";
    }
  }
  
  module.exports = Player;
  