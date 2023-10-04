const Player = require('./Player.js');

class Game {

    constructor(nb){
        this.TableOfPlayers = [];
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
            this.TableOfPlayers.push(new Player(name));
        }
    }

    missionNumberPlayer(){
        this.TableOfPlayers.forEach
            ((Player) => Player.nbRandom());
    }

    targetPlayer(){
        this.shuffleTableOfPlayers();
    }

    shuffleTableOfPlayers(){
        const playersCopy = [...this.TableOfPlayers];
        
        // Appliquez l'algorithme Fisher-Yates pour mélanger les joueurs
        for (let i = playersCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersCopy[i], playersCopy[j]] = [playersCopy[j], playersCopy[i]];
        }

        // Remplacez la liste d'origine par la liste mélangée
        this.TableOfPlayers = playersCopy;
    }

    startGame(){
        console.log("Le jeu démarre !");
        
        this.TableOfPlayers.forEach
            ((Player) => console.log(`${Player.name} - Numéro : ${Player.number}`));
    }
  }
  
  module.exports = Game;
  
  