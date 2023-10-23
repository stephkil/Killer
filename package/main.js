
async function main() {
  
    
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
