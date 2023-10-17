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
    
    async taskRandom(bdd) {
      const result = await bdd.collections.Task.aggregate([
        { $sample: { size: 1 } }
      ]).next();

      return result.task;
    }
  }
  
  module.exports = Player;
  