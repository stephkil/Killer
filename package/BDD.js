// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

const secrets = require("../secrets.json");
const { MongoClient, ServerApiVersion } = require('mongodb');

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
        this.collectionNames = ['User','Games','Players'];
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
        await this.collections.Players.deleteMany({ id_game : game.id_game });
        await this.collections.Games.deleteMany({ _id : game.id_game });

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
            password : pwd
        });

        console.log(`profil is register with id : ${result.insertedId}`);
        return true;
    }

    async sendGame(game){
        const result = await this.collections.Games.insertOne({
            name : game.name,
            nb_Player : game.nbPlayer,
            date_debut : new Date(),
            heures_restante : game.end_date
        });

        console.log(`game is created with id : ${result.insertedId}`);

        return result.insertedId;
    }

    async sendPlayer(game){
        for(let i=0; i < game.nbPlayer; i++){
            await this.collections.Players.insertOne({
                id_Player : game.TableInGame[i].idPlayer,
                name : game.TableInGame[i].name,
                id_game : game.TableInGame[i].game,
                target : game.TableInGame[i].target,
                mission : game.TableInGame[i].number,
                nombre_kill : game.TableInGame[i].nbKill,
                status : game.TableInGame[i].status
            })
        };
    }
}


module.exports = BDD;

