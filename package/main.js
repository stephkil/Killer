/* -------------------------------------------------------------------------- */
/*                                    Garage à bit                                */
/* -------------------------------------------------------------------------- */

const Game = require('./Game');
const BDD = require('./BDD');

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

    let name = await ask(Question3);
    let pwd = await ask(Question4);

    await bdd.insertUser(name,pwd);

    /*
    let nb = await ask(Question1);
    nb = Number(nb);
    const game = new Game(nb,456);

    game.initGame();
    game.displayGame();
 
    while(game.playerInGame > 1){
        let killed = await ask(Question2);
        killed = Number(killed);
        game.kill(killed);

        game.displayGame(); 
    }

    console.log("GG " + game.TableInGame[0].name + ", tu es le killer ultime !");
    */

    rl.close();
    await bdd.closeBDD();
}

main();
