const Player = require('./Player');

class Game {

    constructor(nb,gameName,timing){
        this.id_game = null;
        this.name = gameName;
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = nb;
        this.playerInGame = nb;
        this.end_date = timing;
    }
  
    async initGame(rl){
        await this.addPlayer(rl);
        this.missionNumberPlayer();
        this.shuffleTableOfPlayers();
        this.targetPlayer();
    }

    async addPlayer(rl,player){
        let playerName = null;
        for (let i = 0; i < this.nbPlayer; i++) {
            playerName = await this.askName(i,rl);
            const player = new Player(i,playerName,this.id_game)
            this.TableOfPlayers.push(player);
        }
    }

    async askName(i,rl){
        let question = `quel est le nom du ${i+1} Joueur ? `;
        return new Promise((resolve) => {
            rl.question(question, (response) => resolve(response.trim()));
        });
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
  
  