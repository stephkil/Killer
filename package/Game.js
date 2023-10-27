const Player = require('./Player');

class Game {

    constructor(){
        this.name = '';
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = null;
        this.end_date = null;
        this.winner = undefined;
    }
    
    destroy(){
        this.name = '';
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = null;
        this.end_date = null;
        this.winner = undefined;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Init                                    */
    /* -------------------------------------------------------------------------- */


    async taskRandom(bdd) { // on attribue à un joueur sa mission pour le tuer, aléatoirement
        const result = await bdd.collections.Task.aggregate([
          { $sample: { size: 1 } }
        ]).next();
  
        return result.task;
      }

    shuffleTableOfPlayers(){ // On mélange la liste des joueur afin de pas target dans l'ordre d'ajout
        const playersCopy = [...this.TableOfPlayers];
        
        for (let i = playersCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersCopy[i], playersCopy[j]] = [playersCopy[j], playersCopy[i]];
        }

        this.TableInGame = playersCopy;
    }

    targetPlayer(){ // avec la liste mélanger cela target le prochain joueur de la nouvelle liste
        for(let i = 0 ; i < this.nbPlayer; i++){
        this.TableInGame[i].target = this.TableInGame[(i+1) % this.nbPlayer].name;
        this.TableInGame[i].idPlayer = i;
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Fonction                                  */
    /* -------------------------------------------------------------------------- */


    async kill(personkill,bdd){ // gestion du cas "kill"
        
        // Recherche du tué
        let idx = await this.TableInGame.findIndex(player => player.idPlayer == personkill);
        let killed = this.TableInGame[idx];

        // Recherche du tueur
        let idx2 = await this.TableInGame.findIndex(player => player.target == killed.name);
        let killer = this.TableInGame[idx2];

        await bdd.updateKill(killer,killed); // on va update les info dans la bdd après le kill

        killer.target = killed.target;
        killer.nbKill ++;

        killed.status = "dead";
        killed.target = "none";

        if(killer.name == killer.target) {
            this.winner = killer.name;
            await bdd.updateGame(killer);
            return false // si un joueur dois se tué lui même cela veut dire que il y a plus que lui, il gagne donc et on stop la game
        }
        return true; // sinon on continue à jouer
    }
  }
  
  module.exports = Game;
  
