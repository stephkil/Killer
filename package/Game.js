const Player = require('./Player');
const Success = require('./Success');
const success = new Success();
class Game {

    constructor(){
        this.name = '';
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = 0;
        this.start_date = null;
        this.end_date = null;
        this.winner = undefined;
        this.histo = []
    }
    
    destroy(){
        this.name = '';
        this.TableOfPlayers = [];
        this.TableInGame = [];
        this.nbPlayer = null;
        this.start_date = null;
        this.end_date = null;
        this.winner = undefined;
        this.histo = [];
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Init                                    */
    /* -------------------------------------------------------------------------- */


    async getDistinctLists(bdd) {
        const result = await bdd.collections.Task.aggregate([
            {
                // Regrouper par le champ 'list' pour obtenir des valeurs uniques
                $group: {
                    _id: "$list"
                }
            },
            {
                // Projeter uniquement le nom des listes (l'id est le nom du champ 'list')
                $project: {
                    _id: 0,
                    list: "$_id"
                }
            }
        ]).toArray();
    
        // Retourner le nombre de listes distinctes et leurs noms
        return {
            count: result.length,
            lists: result.map(item => item.list)
        };
    }
    
    async taskRandom(bdd, taskType) {
        let matchCondition;
    
        if (Array.isArray(taskType)) {
            // Si taskType est un tableau, on utilise $in pour filtrer
            matchCondition = { list: { $in: taskType } };
        } else {
            // Si taskType n'est pas un tableau, on utilise une égalité simple
            matchCondition = { list: taskType };
        }
    
        // Effectuer l'agrégation avec le match conditionnel
        const result = await bdd.collections.Task.aggregate([
            { $match: matchCondition },
            { $sample: { size: 1 } }
        ]).next();
    
        return result ? result.task : null; // Retourne la tâche si elle existe, sinon null
    }
    
    

    shuffleTableOfPlayers(){ // On mélange la liste des joueur afin de pas target dans l'ordre d'ajout
        
        for (let i = this.TableOfPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.TableOfPlayers[i], this.TableOfPlayers[j]] = [this.TableOfPlayers[j], this.TableOfPlayers[i]];
        }
        this.TableInGame = this.TableOfPlayers;
    }

    targetPlayer(){ // avec la liste mélanger cela target le prochain joueur de la nouvelle liste
        for(let i = 0 ; i < this.nbPlayer; i++){
        this.TableInGame[i].target = this.TableInGame[(i+1) % this.nbPlayer].name;
        this.TableInGame[i].idPlayer = i;
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Fonction                                  */
    /* -------------------------------------------------------------------------- */

    async newKill(bdd,data,action){
        // Recherche du tué
        let killed = this.TableInGame[data[2]];
        console.log("new kill : ", killed.name)
        await bdd.updateNewKill(killed,action); // on va update les info dans la bdd après le kill
        killed.status = action;
        return true;
    }

    async contestKill(bdd,data,action){
        // Recherche du tué
        let killed = this.TableInGame[data[1]];
        console.log("new kill : ", killed.name)
        await bdd.updateNewKill(killed,action); // on va update les info dans la bdd après le kill
        killed.status = action;
        return true;
    }

    async kill(bdd,data,game){ // gestion du cas "kill"
        console.log("GAME AVANT KILL", game);
        // Recherche du tué
        let killed = this.TableInGame[data[1]];

        let killer = await bdd.updateKill(killed,game); // on va update les info dans la bdd après le kill

        game.histo.push([killer.name,'kill',killed.name,killed.mission]);

        killer.nbKill ++;
        killer.target = killed.target;

        killed.status = "dead";
        killed.target = "none";

       
        if(killer.name == killer.target) {
            this.winner = killer.name;
            //await bdd.updateGame(killer);
            return false // si un joueur dois se tué lui même cela veut dire que il y a plus que lui, il gagne donc et on stop la game
        }
        return true; // sinon on continue à jouer
    }
  }
  
  module.exports = Game;