const Player = require('./Player');

class Game {

    constructor(nb,gameName,timing){
        this.id_game = null;
        this.name = gameName;
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = nb;
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
        for(let i = 0 ; i < this.nbPlayer; i++){
        this.TableInGame[i].target = this.TableInGame[(i+1) % this.nbPlayer].name;
        }
    }

    async kill(personkill,bdd){
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

        killer.nbKill ++;
        killer.target = killed.target;

        await bdd.updateKill(killer.name,killer.game,killer.target,killed.name);

        killed.status = "dead";
        killed.target = "none";

        if(killer.target == killer.name) return false

        return true;
    }

    displayGame(){

        for(let i=0; i<this.nbPlayer;i++){
            console.log(`ID : ${this.TableInGame[i].idPlayer} - ${this.TableInGame[i].name} - Numéro : ${this.TableInGame[i].number} - Target : ${this.TableInGame[i].target} - Kill : ${this.TableInGame[i].nbKill}`);  
        }
        
        console.log("\n");
    }
  }
  
  module.exports = Game;
  
  