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

    game.displayGame();
 
    while(game.playerInGame > 1){
        let killed = await ask(Question2);
        killed = Number(killed);
        game.kill(killed);

        game.displayGame(); 
    }

    console.log("GG " + game.TableInGame[0].name + ", tu es le killer ultime !");

    rl.close();
    await bdd.closeBDD();
}

main();
