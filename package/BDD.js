// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

const secrets = require("../secrets.json");
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion } = require('mongodb');

const Player = require('./Player');

class BDD{

    constructor(){
        this.uri = `mongodb+srv://${secrets.db_username}:${secrets.db_password}@${secrets.cluster}.${secrets.domain}/${secrets.database}?retryWrites=true&w=majority`;        
        console.log(this.uri);
        this.client = new MongoClient(this.uri, { // création du client
            serverApi: {
              version: ServerApiVersion.v1,
              strict: false,
              deprecationErrors: true,
            }
          });
        this.collectionNames = ['User','Games','Players','Task']; // on renseigne le nom des collections présente dans la bdd
        this.collections = {};
    }


    /* -------------------------------------------------------------------------- */
    /*                                  Param BDD                                 */
    /* -------------------------------------------------------------------------- */


    async setupBDD(){
        console.log("connect to database ...."); 
        await this.client.connect(); // connecter le client au serveur
        await this.client.db("admin").command({ ping: 1 }); // envoie d'un ping quand la connection est faite
        console.log("You successfully connected to MongoDB!");

        this.db = this.client.db("Killer_database"); // référencer la database sur vscode
        this.collectionNames.forEach(name => this.collections[name] = this.db.collection(name));
    }

    async closeBDD(game) {
        await this.collections.Players.deleteMany({ game : game.name }); // on retire les joueur racroché a l'id de la game, de la bdd
        await this.collections.Games.deleteMany({ name : game.name }); // on retire la game de la bdd

        //await this.client.close(); // fermeture du client
    }


    /* -------------------------------------------------------------------------- */
    /*                                    User                                    */
    /* -------------------------------------------------------------------------- */


    async insertUser(name,pwd){
        
        this.collections.User.createIndex({username : "text"}); //spécifie la nature de la recherche
        const query = {$text : {$search : name}}; //mise en place des parametres de recherche
        const projection = {_id:1} //recup id du username(db) si name = username
        const cursor = this.collections.User.find(query).project(projection);//objet pour recup les données
        
        if(await cursor.hasNext()) { // si il y a une valeur après celle actuel (ici, si il y a une valeur) on sais que le usenername n'est pas dispo
            console.log("username already taken");
            return false;
        }
                
        const result = await this.collections.User.insertOne({ // inseré le user dans la bdd
            username : name,
            password : await bcrypt.hash(pwd, secrets.saltRounds), // hash du mdp
            success : 0
        });

        console.log(`profil is register with id : ${result.insertedId}`);
        return true;
    }


    /* -------------------------------------------------------------------------- */
    /*                                   Player                                   */
    /* -------------------------------------------------------------------------- */


    async sendPlayer(game){ // pour chaque player, à la création de la game, on les envoie vers la bdd
        game.TableInGame.forEach((p)=>
            this.collections.Players.insertOne({
                id_player : p.idPlayer,
                name : p.name,
                game : game.name,
                init_target : p.target,
                target : p.target,
                mission : p.mission,
                nombre_kill : p.nbKill,
                status : p.status
            })
        );
    }

    async checkPlayer(playerName){ // on vérifie si le user existe avant de permettre de l'ajouter à la game
        this.collections.User.createIndex({username : "text"});
        const query = {$text : {$search : playerName}};
        const projection = {_id:1}
        const cursor = this.collections.User.find(query).project(projection);
        
        if(await cursor.hasNext()) {
            const user = await this.collections.User.findOne({ username: playerName});
            return user;
        }
        
        return false;
    }

    async loginUser(playerName,pwd){
        this.collections.User.createIndex({username : "text"});
        const query = {$text : {$search : playerName}};
        const projection = {_id:1}
        const cursor = this.collections.User.find(query).project(projection);
        
        if(await cursor.hasNext()) {
            const user = await this.collections.User.findOne({ username: playerName});

            const valid = await bcrypt.compare(pwd, user.password);
            console.log(valid);
            
            if (!valid){
                console.log("mauvais mdp  :(");
                return 'pwd';
            };

            console.log("success for login :)");
            return true;
        }
        
        console.log("ce user n'existe pas encore :(");
        return 'username';
    }

    


    /* -------------------------------------------------------------------------- */
    /*                                    Game                                    */
    /* -------------------------------------------------------------------------- */


    async sendGame(game){ // envoie de la game sur la bdd
        await this.collections.Games.insertOne({
            name : game.name,
            nb_Player : game.nbPlayer,
            date_debut : new Date(),
            heures_restante : game.end_date,
            winner : game.winner
        });
    }

    async gameExist(game){ // on vérifie si la game existe, on check le nom car il est unique
        const result = await this.collections.Games.findOne({ name: game.name});

        if(result) {
            console.log("partie trouvé");
            game.nbPlayer = result.nb_Player;
            game.end_date = result.heures_restante;
            game.winner = result.winner;
            console.log(result);

            return true;
        }
        
        console.log("partie non trouvé");
        return false;
    }

    async getGame(game){ // si la game existe, on récupère les infos de la game
        for(let i=0; i<game.nbPlayer;i++){
            const result = await this.collections.Players.findOne({game : game.name, id_player : i});

            if(result){
                const player = new Player();

                player.idPlayer = result.id_player;
                player.name = result.name;
                player.game = result.game;
                player.target = result.target;
                player.mission = result.mission;
                player.nbKill = result.nombre_kill;
                player.status = result.status;

                game.TableInGame.push(player); 
                console.log("game récupéré");  
            }
            else {
                console.log("erreur dans la récupération d'un ou plusieur joueurs")
            }
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Fonction                                  */
    /* -------------------------------------------------------------------------- */
    

    async updateKill(killerInGame, killedInGame){
        
        // je cherche le killer dans la bdd grâce au nom et id de game
        const killer = await this.collections.Players.findOne({ name: killerInGame.name, game: killerInGame.game}); 
        await this.collections.Players.updateOne({ _id: killer._id }, {$inc: { nombre_kill : 1 }}, {$set: { target : killedInGame.target}} ); // update Killer dans bdd
       
         // de même pour le tué
        const killed = await this.collections.Players.findOne({ name: killedInGame.name, game: killedInGame.game});
        await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ status : "dead"}}); // update tué dans bdd
        await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ target : "none" }}); // update tué dans bdd        
    }

    async updateGame(killer){

         // de même pour le tué
        const result = await this.collections.Games.findOne({ name: killer.game});
        await this.collections.Games.updateOne({ _id: result._id }, { $set:{ winner : killer.name}}); // update winner dans bdd     
    }

}


module.exports = BDD;