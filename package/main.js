const Game = require('./Game');

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

function ask(question) {
    return new  Promise((resolve) => {
        rl.question(question, (response) => resolve(response.trim()));
    });
}

async function main() {

    const Question1 = "Combien de joueur ? ";
    const Question2 = "Quel joueur a été tué ? ";

    let nb = await ask(Question1);
    nb = Number(nb);
    const game = new Game(nb);

    game.InitGame();
    game.displayGame();
 
    let killed = await ask(Question2);
    killed = Number(killed);
    game.kill(killed);

    rl.close();
}

main();
