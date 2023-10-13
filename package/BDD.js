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
              strict: true,
              deprecationErrors: true,
            }
          });
        this.collectionNames = ['User'];
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

    async closeBDD() {
        await this.client.close();
    }

    async insertUser(name,pwd){
        const result = await this.collections.User.insertOne({
            username : name,
            password : pwd
        });
        console.log(`profil is register with id : ${result.insertedId}`);
    }

}


module.exports = BDD;

