/* -------------------------------------------------------------------------- */
/*                                    Garage à bit                                */
/* -------------------------------------------------------------------------- */

const Game = require('./Game');
const BDD = require('./BDD');
const Player = require('./Player')

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (response) => resolve(response.trim()));
    });
}

async function main() {
    const bdd = new BDD();
    await bdd.setupBDD();
    
    const Question1 = "Combien de joueurs ? ";
    const Question2 = "Quel joueur a été tué ? ";
    const Question3 = "Username ? "
    const Question4 = "mdp ? "
    const Question5 = "tu veux crée un nuv joueur ? y/n : "
    const Question6 = "nom de la partie ? "
    const Question7 = "temps de partie (en heures) ? "
    const Question8 = "taper entrer pour terminer la partie "

    let answer = await ask(Question5);
    let name,pwd,status = true;
    if(answer == 'y'){
        let name,pwd,status = true;
        do{
            name = await ask(Question3);
            pwd = await ask(Question4);
            status = await bdd.insertUser(name,pwd);
        }while(!status);
    }
    
    let gameName = await ask(Question6);
    let end = Number(await ask(Question7));
    let nb = Number(await ask(Question1));
    const game = new Game(nb,gameName,end);
    game.id_game = await bdd.sendGame(game);

    await game.initGame(rl);
    await bdd.sendPlayer(game);
 
    let gameRunning = true;

    while(gameRunning){
        game.displayGame(); 
        let killed = await ask(Question2);
        killed = Number(killed);
        gameRunning = await game.kill(killed,bdd);
    }

    game.displayGame();
    
    let i = 0;
        do{
            if(game.TableInGame[i].status == "dead") i++;
        }while(game.TableInGame[i].status == "dead");

    console.log("GG " + game.TableInGame[i].name + ", tu es le killer ultime !");

    await ask(Question8);
    rl.close();
    await bdd.closeBDD(game);
}

main();
