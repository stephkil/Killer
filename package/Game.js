const Player = require('./Player');

class Game {

    constructor(nb){
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = nb;
    }
  
    InitGame(){
        this.addPlayer();
        this.missionNumberPlayer();
        this.targetPlayer();
    }

    addPlayer(PlayerName){
        for (let i = 1; i < this.nbPlayer+1; i++) {
            const name = "Player" + i;
            this.TableOfPlayers.push(new Player(i,name));
        }
    }

    missionNumberPlayer(){
        this.TableOfPlayers.forEach
            ((Player) => Player.nbRandom());
    }

    targetPlayer(){
        this.shuffleTableOfPlayers();

        for(let i = 0 ; i < this.nbPlayer; i++){
        this.TableInGame[i].target = this.TableInGame[(i+1) % this.nbPlayer].name;
        }
    }

    shuffleTableOfPlayers(){
        const playersCopy = [...this.TableOfPlayers];
        
        for (let i = playersCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersCopy[i], playersCopy[j]] = [playersCopy[j], playersCopy[i]];
        }

        this.TableInGame = playersCopy;
    }

    startGame(){
        console.log("Voici les concurents");
        this.TableOfPlayers.forEach
            ((Player) => console.log(`${Player.idPlayer} - ${Player.name}`));
        
        console.log("\nLe jeu démarre !");
        this.TableInGame.forEach
            ((Player) => console.log(`ID : ${Player.idPlayer} - ${Player.name} - Numéro : ${Player.number}  - Target : ${Player.target}`));
    }
  }
  
  module.exports = Game;
  
  