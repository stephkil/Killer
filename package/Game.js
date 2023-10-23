const Player = require('./Player');

class Game {

    constructor(){
        this.name = '';
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = null;
        this.end_date = null;
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
        let idx = this.TableInGame.findIndex(player => player.idPlayer === personkill);

        let idx2 = "life";
        let i = 1;
        do{
            idx2 = ((idx-i + this.nbPlayer) % this.nbPlayer);
            if(this.TableInGame[idx2].status == "dead") {
                i++;
            }
        }while(this.TableInGame[idx2].status == "dead");

        let killer = this.TableInGame[idx2];
        let killed = this.TableInGame[idx];

        killer.nbKill ++; // on incrémente le compteur de kill
        killer.target = killed.target; // on donne au killer, une nouvelle target

        await bdd.updateKill(killer.name,killer.game,killer.target,killed.name); // on va update les info dans la bdd après le kill

        killed.status = "dead"; // on actualise le statut du tué, localement
        killed.target = "none"; // on actualise le statut du tué localement

        if(killer.target == killer.name) return false // si un joueur dois se tué lui même cela veut dire que il y a plus que lui, il gagne donc et on stop la game

        return true; // sinon on continue à jouer
    }

    displayGame(){ // j'affiche la game localement sur le terminal
        for(let i=0; i<this.nbPlayer;i++){
            console.log(`ID : ${this.TableInGame[i].idPlayer} - ${this.TableInGame[i].name} - Mission : ${this.TableInGame[i].mission} - Target : ${this.TableInGame[i].target} - Kill : ${this.TableInGame[i].nbKill}`);  
        }
        
        console.log("\n");
    }
  }
  
  module.exports = Game;
  
