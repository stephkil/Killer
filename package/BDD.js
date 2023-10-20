// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

const secrets = require("../secrets.json");
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion } = require('mongodb');

const Player = require('./Player');

class BDD{

    constructor(){
        this.uri = `mongodb+srv://${secrets.db_username}:${secrets.db_password}@${secrets.cluster}.${secrets.domain}/${secrets.database}?retryWrites=true&w=majority`;        
        console.log(this.uri);
        this.client = new MongoClient(this.uri, {
            serverApi: {
              version: ServerApiVersion.v1,
              strict: false,
              deprecationErrors: true,
            }
          });
        this.collectionNames = ['User','Games','Players','Task'];
        this.collections = {};
    }

    async setupBDD(){
        console.log("connect to database ....");
        // Connect the client to the server	(optional starting in v4.7)
        await this.client.connect();
        // Send a ping to confirm a successful connection
        await this.client.db("admin").command({ ping: 1 });
        console.log("You successfully connected to MongoDB!");
        // refer database on server (vscode)
        this.db = this.client.db("Killer_database");
        this.collectionNames.forEach(name => this.collections[name] = this.db.collection(name));
    }

    async closeBDD(game) {
        await this.collections.Players.deleteMany({ game : game.name });
        await this.collections.Games.deleteMany({ name : game.name });

        await this.client.close();
    }

    async insertUser(name,pwd){
        //spécifie la nature de la recherche
        this.collections.User.createIndex({username : "text"});
        //mise en palce des parametres de recherche
        const query = {$text : {$search : name}};
        //recup id du username(db) si name = username
        const projection = {_id:1}
        //objet pour recup les donné
        const cursor = this.collections.User.find(query).project(projection);
        
        if(await cursor.hasNext()) {
            console.log("username already taken");
            return false;
        }
                
        const result = await this.collections.User.insertOne({
            username : name,
            password : await bcrypt.hash(pwd, secrets.saltRounds),
            success : 0
        });

        console.log(`profil is register with id : ${result.insertedId}`);
        return true;
    }

    async checkPlayer(playerName){
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


    async sendGame(game){
        await this.collections.Games.insertOne({
            name : game.name,
            nb_Player : game.nbPlayer,
            date_debut : new Date(),
            heures_restante : game.end_date
        });
    }

    async gameExist(game){
        const result = await this.collections.Games.findOne({ name: game.name});

        if(result) {
            console.log("partie trouvé");
            game.nbPlayer = result.nb_Player;
            console.log(result);

            return true;
        }
        
        console.log("partie non trouvé");
        return false;
    }

    async getGame(game){

        for(let i=0; i<game.nbPlayer;i++){
            const result = await this.collections.Players.findOne({game : game.name, id_player : i});

            if(result){
                const player = new Player();

                player.idPlayer = result.id_player;
                //player.idUser = result.user;
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

    async sendPlayer(game){
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

    async updateKill(name,game,target,dead){
        const killer = await this.collections.Players.findOne({ name: name, game: game});
        const killed = await this.collections.Players.findOne({ name: dead, game: game});

        const updateKiller = {
            $inc: { nombre_kill : 1 },
            $set: { target : target} 
        };

        const resultKiller = await this.collections.Players.updateOne({ _id: killer._id }, updateKiller);
        const resultKilled1 = await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ status : "dead" }});
        const resultKilled2 = await this.collections.Players.updateOne({ _id: killed._id }, { $set:{ target : "none" }});
    }
}


module.exports = BDD;

nbPlayer