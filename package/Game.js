const Player = require('./Player');

class Game {

    constructor(nb){
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = nb;
        this.playerInGame = nb;
    }
  
    InitGame(){
        this.addPlayer();
        this.missionNumberPlayer();
        this.shuffleTableOfPlayers();
        this.targetPlayer();
    }

    addPlayer(PlayerName){
        for (let i = 0; i < this.nbPlayer; i++) {
            const name = "Player" + i;
            this.TableOfPlayers.push(new Player(i,name));
        }
    }

    missionNumberPlayer(){
        this.TableOfPlayers.forEach
            ((Player) => Player.nbRandom());
    }

    shuffleTableOfPlayers(){
        const playersCopy = [...this.TableOfPlayers];
        
        for (let i = playersCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersCopy[i], playersCopy[j]] = [playersCopy[j], playersCopy[i]];
        }

        this.TableInGame = playersCopy;
    }

    targetPlayer(){
        for(let i = 0 ; i < this.playerInGame; i++){
        this.TableInGame[i].target = this.TableInGame[(i+1) % this.playerInGame].name;
        }
    }

    kill(personkill){
        const idx = this.TableInGame.findIndex(player => player.idPlayer === personkill);

        this.TableInGame[(idx-1 + this.playerInGame) % this.playerInGame].nbKill ++;

        this.TableInGame.splice(idx,1);
        
        this.playerInGame --;
        this.targetPlayer();
    }

    displayGame(){
        this.TableInGame.forEach
            ((Player) => console.log(`ID : ${Player.idPlayer} - ${Player.name} - Numéro : ${Player.number} - Target : ${Player.target} - Kill : ${Player.nbKill}`));
        
        console.log("\n");
    }
  }
  
  module.exports = Game;
  
  