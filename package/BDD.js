// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

const secrets = require("../secrets.json");
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion } = require('mongodb');

const Player = require('./Player');
const Success = require('./Success');
const success = new Success();
class BDD{

    constructor(){
        this.uri;
        
        // Vérification de l'environnement d'exécution (local ou production)
        if (process.env.NODE_ENV === 'production') {
            // En production (Heroku), utilisez les variables d'environnement
            this.uri = `mongodb+srv://${process.env.db_username}:${process.env.db_password}@${process.env.cluster}.${process.env.domain}/${process.env.database}?retryWrites=true&w=majority`;
        } else {
            // En local, utilisez le fichier secrets.json
            this.uri = `mongodb+srv://${secrets.db_username}:${secrets.db_password}@${secrets.cluster}.${secrets.domain}/${secrets.database}?retryWrites=true&w=majority`;
        }
        //console.log(this.uri);

        this.client = new MongoClient(this.uri, { // création du client
            serverApi: {
              version: ServerApiVersion.v1,
              strict: false,
              deprecationErrors: true,
            }
          });
        this.collectionNames = ['User','Games','Players','Historique','Task','Success']; // on renseigne le nom des collections présente dans la bdd
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

        console.log("update find de game : ", game.name);

        // update de la fin de partie

        const tabName = [];
        const tabTask = [];
        const tabKill = [];
        const tabStatus = [];

        const survivant = [];

        let topKillerLife;
        let topKillerAll;
        let nbLife = 0;
        let nbAll = 0;
        
        // recherche des dernière info manquante

        for(let i=0; i<game.nbPlayer;i++){

            const user = await this.collections.User.findOne({ username: game.TableInGame[i].name});

            tabName[i]= game.TableInGame[i].name;
            tabTask[i]= game.TableInGame[i].mission;
            tabKill[i]= game.TableInGame[i].nbKill;
            tabStatus[i] = game.TableInGame[i].status;

            if(game.TableInGame[i].status == "life"){
                survivant.push(game.TableInGame[i].name);
            }

            if(game.TableInGame[i].nbKill > nbLife && game.TableInGame[i].status == "life"){
                topKillerLife = game.TableInGame[i].name;
                nbLife = game.TableInGame[i].nbKill;
            }
            if(game.TableInGame[i].nbKill > nbAll){
                topKillerAll = game.TableInGame[i].name;
                nbAll = game.TableInGame[i].nbKill;
            }
            if(game.TableInGame[i].status == "life"){
                await this.collections.User.updateOne({ _id: user._id }, {$inc: { game_survivant : 1 }});
                await this.checkSuccess(game.TableInGame[i].name,game.TableInGame[i].nbKill,"Spectateur");
            }
        }

        // Top killer

        console.log("top killer : ", topKillerAll);
        const top_killer = await this.collections.User.findOne({ username: topKillerAll});
        await this.collections.User.updateOne({ _id: top_killer._id }, {$inc: { game_topKiller : 1 }});

        console.log("Killer Alpha : ", topKillerLife);
        const killer_alpha = await this.collections.User.findOne({ username: topKillerLife});
        await this.collections.User.updateOne({ _id: killer_alpha._id }, {$inc: { game_killerAlpha : 1 }});

        if(topKillerAll == topKillerLife){
            console.log("nous avons un killer suprème : ", topKillerLife);
            await this.collections.User.updateOne({ _id: killer_alpha._id }, {$inc: { game_killerSupreme : 1 }});
        }

        // winner 

        if(game.winner == undefined){
            game.winner = topKillerLife;
            await this.collections.Games.updateOne({ name: game.name }, {$set:{ winner : game.winner}}); // update winner dans bdd
        }

        const user = await this.collections.User.findOne({username : game.winner});
        console.log("winner : ", user.username);
        if(user){
            await this.collections.User.updateOne({ _id: user._id }, {$inc: { game_win : 1 }});
        }

        // last update 

        await this.collections.Games.updateOne({name : game.name}, {$set:{allName : tabName}});
        await this.collections.Games.updateOne({name : game.name}, {$set:{allTask : tabTask}});
        await this.collections.Games.updateOne({name : game.name}, {$set:{allKill : tabKill}});
        await this.collections.Games.updateOne({name : game.name}, {$set:{allStatus : tabStatus}});

        // on ajoute la partie dans l'historique

        const result = await this.collections.Games.findOne({name:game.name});
        result.survivant = survivant;

        let resultHisto = await this.collections.Historique.insertOne(result);
        let histoId = resultHisto.insertedId;

        for(let i = 0; i < game.nbPlayer; i++){
            const user = await this.collections.User.findOne({ username: game.TableInGame[i].name});
            await this.collections.User.updateOne({ _id: user._id }, {$inc: { game_played : 1 }}); // update nombre de partie jouer ou en cours
            await this.collections.User.updateOne({ _id: user._id }, {$inc: { kill : game.TableInGame[i].nbKill }});
            await this.collections.User.updateOne({ _id: user._id }, {$push: { historique : histoId }});

            await this.checkSuccess(game.TableInGame[i].name,game.TableInGame[i].nbKill,"Pentakill");
        }
        
        // delete la partie et ses players

        await this.collections.Players.deleteMany({ game : game.name }); // on retire les joueur racroché a l'id de la game, de la bdd
        await this.collections.Games.deleteOne({ name : game.name }); // on retire la game de la bdd
        
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
            kill : 0,
            success : [],
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
            allName : tab,
            histo : game.histo
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
                game.histo = result.histo;
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
    
    async updateNewKill(killedInGame,action){
        const killed = await this.collections.Players.findOne({ name: killedInGame.name, game: killedInGame.game});
        console.log("killed : ", killed);
        await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ status : action}});
    }

    async updateKill(killedInGame,game){
        
        // je cherche le killer  et le killed dans la bdd grâce au nom et id de game
        const killed = await this.collections.Players.findOne({ name: killedInGame.name, game: killedInGame.game});
        const killer = await this.collections.Players.findOne({ target: killedInGame.name, game: killedInGame.game});

        console.log("killer : ", killer.name);
        console.log("killed : ", killed.name);

        await this.checkSuccess(killer.name,game,"First Blood");
        await this.checkSuccess(killed.name,game,"Spawn Kill");

        //update du killer
        await this.collections.Players.updateOne({ _id: killer._id }, {$inc: { nombre_kill : 1 }});
        await this.collections.Players.updateOne({ _id: killer._id }, {$set: { target : killedInGame.target }});

         // de même pour le tué
        await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ status : "dead"}});
        await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ target : "none" }});
        
        const result = await this.collections.Games.findOne({ name: killer.game});
        await this.collections.Games.updateOne({ _id: result._id }, { $push: { histo : [killer.name,'kill',killed.name,killed.mission] }});     
        
        return killer;
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
        //console.log(result.friends);
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


    /* -------------------------------------------------------------------------- */
    /*                                 Success                                    */
    /* -------------------------------------------------------------------------- */

    async getSuccess(name){
        // Créer un tableau vide pour stocker les résultats
        let resultArray = [];
        var user = await this.collections.User.findOne({ username: name });
        var listOfSuccess = user.success;

        // Récupérer les documents avec seulement les champs 'title' et 'description'
        const cursor = this.collections.Success.find({}, { title: 1, description: 1 });

        // Utiliser une boucle pour parcourir les résultats
        for await (const success of cursor) {
            if(listOfSuccess.includes(success.title)){
                resultArray.push([success.title, 0, success.description, true]);
            } else {
                resultArray.push([success.title, 0, success.description, false]);
            }
        }

        // Afficher le tableau avec les données récupérées
        //console.log(resultArray);
        return resultArray;
    }

    async checkSuccess(name,game,title){

        var user = await this.collections.User.findOne({ username: name });
        var listOfSuccess = user.success;

        var result = await success.checkAllSuccess(user,game,title);
        console.log(result);
        if(result && !listOfSuccess.includes(title)){
            console.log(name, "viens d'optenir le succès :", title);
            await this.collections.User.updateOne({ username: name }, { $push: { success: title }}); 
        }
    }

    async last2Games(user){

        const allGames = user.historique;

        if (allGames.length >= 2) {
            const lastTwoGames = allGames.slice(-2); // Extrait les deux dernières parties
            
            var result = await this.collections.Historique.findOne({ _id: lastTwoGames[0] })
            const result1 = result.survivant.includes(user.username);

            result = await this.collections.Historique.findOne({ _id: lastTwoGames[1] })
            const result2 = result.survivant.includes(user.username);

            if(result1 && result2){
                return true;
            }

            console.log("Les deux dernières parties :", result1, " || ", result2);

        } else { 
            console.log("Il y a moins de deux parties dans l'historique");
        }

        return false;
    }

}


module.exports = BDD;