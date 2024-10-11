// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

const secrets = require("../secrets.json");
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion } = require('mongodb');

const Player = require('./Player');

class BDD{

    constructor(){
        this.uri = `mongodb+srv://${secrets.db_username}:${secrets.db_password}@${secrets.cluster}.${secrets.domain}/${secrets.database}?retryWrites=true&w=majority`;        
        //console.log(this.uri);
        this.client = new MongoClient(this.uri, { // création du client
            serverApi: {
              version: ServerApiVersion.v1,
              strict: false,
              deprecationErrors: true,
            }
          });
        this.collectionNames = ['User','Games','Players','Historique','Task']; // on renseigne le nom des collections présente dans la bdd
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

        console.log("update bdd : ", game);
        // update l'historique partie 
        const tabName = [];
        const tabTask = [];
        const tabKill = [];
        const tabStatus = [];

        for(let i=0; i<game.nbPlayer;i++){
            tabName[i]= game.TableInGame[i].name;
            tabTask[i]= game.TableInGame[i].mission;
            tabKill[i]= game.TableInGame[i].nbKill;
            tabStatus[i] = game.TableInGame[i].status;
        }
        await this.collections.Games.updateOne({name : game.name}, {$set:{allName : tabName}});
        await this.collections.Games.updateOne({name : game.name}, {$set:{allTask : tabTask}});
        await this.collections.Games.updateOne({name : game.name}, {$set:{allKill : tabKill}});
        await this.collections.Games.updateOne({name : game.name}, {$set:{allStatus : tabStatus}});

        // on ajoute la partie dans l'historique
        const result = await this.collections.Games.findOne({name:game.name});
        let resultHisto = await this.collections.Historique.insertOne(result);
        let histoId = resultHisto.insertedId;

        await this.collections.Players.deleteMany({ game : game.name }); // on retire les joueur racroché a l'id de la game, de la bdd
        await this.collections.Games.deleteOne({ name : game.name }); // on retire la game de la bdd

        for(let i = 0; i < game.nbPlayer; i++){
            const user = await this.collections.User.findOne({ username: game.TableInGame[i].name});
            await this.collections.User.updateOne({ _id: user._id }, {$inc: { game_played : 1 }}); // update nombre de partie jouer ou en cours
            await this.collections.User.updateOne({ _id: user._id }, {$push: { historique : histoId }}); 
        }

        const user = await this.collections.User.findOne({username : game.winner});
        console.log("winner : ", user);
        if(user){
            await this.collections.User.updateOne({ _id: user._id }, {$inc: { game_win : 1 }});
        }
        
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
            //console.log("username already taken");
            return false;
        }
                
        const result = await this.collections.User.insertOne({ // inserer le user dans la bdd
            username : name,
            password : await bcrypt.hash(pwd, secrets.saltRounds), // hash du mdp
            game_played : 0,
            game_win : 0,
            game_survivant : 0,
            game_topKiller : 0,
            game_killerAlpha : 0,
            game_killerSupreme : 0,
            success : 0,
            friends : [],
            historique : []
        });

        console.log(`profil is register with id : ${result.insertedId}`);
        return true;
    } 

    async loginUser(playerName,pwd){

        const user = await this.collections.User.findOne({ username: playerName});

        if(user){
            const valid = await bcrypt.compare(pwd, user.password);
            
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

    async getUser(name){

        const user = await this.collections.User.findOne({username : name});
        
        var tab = [];
        
        if(user){
            tab[0] = user.username;  
            tab[1] = user.title;
            
            tab[2] = user.game_played;
            tab[3] = user.game_survivant;
            tab[4] = user.game_topKiller;
            tab[5] = user.game_killerAlpha;
            tab[6] = user.game_killerSupreme;


            tab[7] = user.kill;
            tab[8] = user.success;
        }

        return tab;
    }

    async allGame(nameToFind){

        var gameName = [];
        let result = true

        while(result){
            result = await this.collections.Players.findOne({ name : nameToFind , game : { $nin: gameName }})
            //console.log(result)
            if(result != null){
                gameName.push(result.game)
            }
        }
        return gameName
    };
    


        /* -------------------------------------------------------------------------- */
        /*                                   Player                                   */
        /* -------------------------------------------------------------------------- */


        async sendPlayer(game){ // pour chaque player, à la création de la game, on les envoie vers la bdd
            game.TableInGame.forEach((p)=>
                this.collections.Players.insertOne({
                    id_player : p.idPlayer,
                    name : p.name,
                    game : game.name,
                    target : p.target,
                    mission : p.mission,
                    nombre_kill : p.nbKill,
                    status : p.status
                })
            );
        }

        async checkPlayer(playerName){ // on vérifie si le user existe avant de permettre de l'ajouter à la game
            
            // Trouver l'utilisateur avec le nom exact, sensible à la casse et aux caractères spéciaux
            const user = await this.collections.User.findOne({ username: playerName });
            console.log("friend found : ", user);

            if (user) {
                console.log("friend name : ", user.username);
                return user;
            }

            /*
            this.collections.User.createIndex({username : "text"});
            const query = {$text : {$search : playerName}};
            const projection = {_id:1}
            const cursor = this.collections.User.find(query).project(projection);
            
            if(await cursor.hasNext()) {
                const user = await this.collections.User.findOne({ username: playerName});
                return user.username;
            }*/
        
        return false;
        } 

    async mainPlayerDisplay(gameName,playerName){
        const user = await this.collections.Players.findOne({game : gameName, name: playerName});
        return user.id_player;
    }

    async targetPlayerDisplay(gameName,targetPlayer){
        const target = await this.collections.Players.findOne({game : gameName, name : targetPlayer});
        if(target){
            return target.id_player;
        } else{
            return "none";
        }
    }
 

    /* -------------------------------------------------------------------------- */
    /*                                    Game                                    */
    /* -------------------------------------------------------------------------- */


    async sendGame(game){ // envoie de la game sur la bdd
        console.log(game);
        var tab = [];

        for(let i=0; i < game.nbPlayer; i++){
            tab[i] = (game.TableInGame[i].name)
        }

        await this.collections.Games.insertOne({
            name : game.name,
            nb_Player : game.nbPlayer,
            date_debut : new Date(),
            date_fin : game.end_date,
            winner : game.winner,
            allName : tab
        });
    }

    async gameExist(game){ // on vérifie si la game existe, on check le nom car il est unique
        const result = await this.collections.Games.findOne({ name: game.name});

        if(result) {
            if(result.winner == null){
                //console.log("partie trouvé");
                game.nbPlayer = result.nb_Player;
                game.start_date = result.date_debut;
                game.end_date = result.date_fin;
                game.winner = result.winner;
                return true;
            } else {
                //console.log("partie trouvé mais déjà finis");
                return false;
            }  
        }
        
        console.log("partie non trouvé");
        return false;
    }

    async getGame(game){ // si la game existe, on récupère les infos de la game
        
        game.TableInGame = [];

        for(let i=0; i<game.nbPlayer;i++){
            const result = await this.collections.Players.findOne({game : game.name, id_player : i});
            //console.log(result);
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
        
        // je cherche le killer  et le killed dans la bdd grâce au nom et id de game
        const killer = await this.collections.Players.findOne({ name: killerInGame.name, game: killerInGame.game});
        const killed = await this.collections.Players.findOne({ name: killedInGame.name, game: killedInGame.game});

        console.log("killer : ", killer);
        console.log("killed : ", killed);

        //update du killer
        await this.collections.Players.updateOne({ _id: killer._id }, {$inc: { nombre_kill : 1 }});
        await this.collections.Players.updateOne({ _id: killer._id }, {$set: { target : killedInGame.target }}); 

         // de même pour le tué
        await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ status : "dead"}});
        await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ target : "none" }});
        
    }

    async updateGame(killer){
         // de même pour le tué
        const result = await this.collections.Games.findOne({ name: killer.game});
        await this.collections.Games.updateOne({ _id: result._id }, { $set:{ winner : killer.name}}); // update winner dans bdd     
    }

    /* -------------------------------------------------------------------------- */
    /*                                   friend                                   */
    /* -------------------------------------------------------------------------- */

    async getFriend(name){
        const result = await this.collections.User.findOne({username : name});
        let friends = result.friends;
        console.log(result.friends);
        
        var info = [];

        for(var i=0; i<friends.length;i++){
            var tab = [];
            
            const friend = await this.collections.User.findOne({username : friends[i]});
        
            tab[0] = friend.username;  
            tab[1] = friend.title;
            
            tab[2] = friend.game_played;
            tab[3] = friend.game_survivant;
            tab[4] = friend.game_topKiller;
            tab[5] = friend.game_killerAlpha;
            tab[6] = friend.game_killerSupreme;


            tab[7] = friend.kill;
            tab[8] = friend.success;

            info[i] = tab;
        }
        
        //console.log(info);
        return info;
    }
    
    async getListOfFriend(name){
        const result = await this.collections.User.findOne({username : name});
        console.log(result.friends);
        return result.friends;
    }
    
    async addFriend(nameToAdd,name){
        await this.collections.User.updateOne(
            { username : name },
            { $push: { friends: nameToAdd }},
        );
    }

    async delFriend(nameToDel,name){
        await this.collections.User.updateOne(
            { username : name },
            { $pull: { friends: nameToDel }},
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                                 historique                                 */
    /* -------------------------------------------------------------------------- */

    async getHisto(name){
        var tabGame = [];
        var tabHisto = [];

        let user = await this.collections.User.findOne({username : name});
        tabHisto = user.historique;

        //console.log("tabHisto : " + tabHisto);
        
        for(var i=0; i<=tabHisto.length;i++){
            let result = await this.collections.Historique.findOne({_id : tabHisto[i]});
            tabGame.push(result);
        }
        
        return tabGame;
    }

}


module.exports = BDD;