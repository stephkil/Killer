/* -------------------------------------------------------------------------- */
/*                     comment divider  => alt + maj + x                      */
/* -------------------------------------------------------------------------- */

const Game = require('./Game');
const BDD = require('./BDD');
const Player = require('./Player')

const readline = require('readline');

const rl = readline.createInterface({ // pour demander du texte
    input: process.stdin,
    output: process.stdout
  });

function ask(question) { // attendre la réponse
    return new Promise((resolve) => {
        rl.question(question, (response) => resolve(response.trim()));
    });
}

async function main() {
    const bdd = new BDD();
    await bdd.setupBDD(); // démarer
    
    const Question1 = "Combien de joueurs ? ";
    const Question2 = "Quel joueur a été tué ? ";
    const Question3 = "Username : "
    const Question4 = "mdp : "
    const Question5 = "tu veux crée un nuv joueur ? (y/n) : "
    const Question6 = "nom de la partie : "
    const Question7 = "temps de partie (en heures) ? "
    const Question8 = "taper entrer pour terminer la partie "
    const Question9 = "la partie existe t-elle déjà ? (y/n) :"

/* -------------------------------------------------------------------------- */
/*                                  New Player                                */
/* -------------------------------------------------------------------------- */

    let answer = await ask(Question5); //crée un nouveau joueur
    let name,pwd,status = true;
    if(answer == 'y'){
        let name,pwd,status = true;
        do{
            name = await ask(Question3); // username
            pwd = await ask(Question4); // password
            status = await bdd.insertUser(name,pwd); // insérer un user unique
        }while(!status); // si il exise déja, on recommence
    }

/* -------------------------------------------------------------------------- */
/*                                  Game existe                               */
/* -------------------------------------------------------------------------- */

    let gameExist = await ask(Question9); // est ce que la game existe
    let gameName = await ask(Question6); // nom de la game
    const game = new Game(gameName); // création de la game

    gameExist = await bdd.gameExist(game);

    if(gameExist){
        await bdd.getGame(game);
    }

/* -------------------------------------------------------------------------- */
/*                               Game existe pas                              */
/* -------------------------------------------------------------------------- */
    else {
        let end,nb = null;

        nb = Number(await ask(Question1)); // nb joueur
        end = Number(await ask(Question7)); // tps partie

        game.nbPlayer = nb;
        game.end_date = end;

        await bdd.sendGame(game); //envoie de la game

        await game.initGame(rl,bdd); // init game
        await bdd.sendPlayer(game); // envoie des joueurs
    }
    
/* -------------------------------------------------------------------------- */
/*                              Déroulement Game                              */
/* -------------------------------------------------------------------------- */

    let killed,gameRunning = true; // variable pour continuer  à jouer

    while(gameRunning){
        game.displayGame(); 
        killed = await ask(Question2); // qui est mort

        if(killed == 'q') break; // sortir du jeu
        else killed = Number(killed); // mettre en forme

        gameRunning = await game.kill(killed,bdd); // update les joueurs après kill
    }

/* -------------------------------------------------------------------------- */
/*                              Cloture Game                                  */
/* -------------------------------------------------------------------------- */
    game.displayGame();
    
    if(killed != 'q'){
        let i = 0;
            do{ // check quel joueur est à afficher gagnant
                if(game.TableInGame[i].status == "dead") i++;
            }while(game.TableInGame[i].status == "dead");

        console.log("GG " + game.TableInGame[i].name + ", tu es le killer ultime !");

        await ask(Question8); // attente de touche
        await bdd.closeBDD(game); // fermer bdd + suprimer élement superflu
    }
    else{
        console.log("sortie du jeu");
        await bdd.client.close(); // fermer bdd
    }

    rl.close(); // fermer espace pour écrire
}

main();
