/* -------------------------------------------------------------------------- */
/*                                serveur setup                               */
/* -------------------------------------------------------------------------- */
 
let express =  require('express');
let app = express();
let ejs =  require('ejs');
let bodyParser = require('body-parser');
const session = require('express-session');
const secrets = require("./secrets.json");


let paramGame;
let paramPlayer;
let gameExist = null;
var gameRunning = true;
var nbAdd = 1;
var data = [];

/* -------------------------------------------------------------------------- */
/*                                package setup                               */
/* -------------------------------------------------------------------------- */

const Game = require('./package/Game');
const game = new Game();

const BDD = require('./package/BDD');
const bdd = new BDD();

const Player = require('./package/Player');


/* -------------------------------------------------------------------------- */
/*                               Moteur template                              */
/* -------------------------------------------------------------------------- */

app.set('view engine', 'ejs');

/* -------------------------------------------------------------------------- */
/*                                 Middleware                                 */
/* -------------------------------------------------------------------------- */
 

app.use('/assets', express.static('public'))
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.use(session({
    secret: secrets.tokenKey,
    resave: false,
    saveUninitialized : true,
    cookie: { maxAge: 6 * 60 * 60 * 1000 } // le user n'aura pas besoin de se reconnecter pendant 4h (6-2)
}));

app.use(require('./middlewares/flash'));


/* -------------------------------------------------------------------------- */
/*                                 Route /                                    */
/* -------------------------------------------------------------------------- */


app.get('/', (req,res) =>{
    reload();
    res.render('index', {data : req.session});
});

app.post('/', (req,res)=>{
    res.redirect('/');
});

  
/* -------------------------------------------------------------------------- */
/*                                  login                                     */
/* -------------------------------------------------------------------------- */

app.get('/auth/login', (req,res)=>{   
    reload();
    res.render('auth/login');
});

app.post('/auth/login', async (req,res)=>{
    if(req.body.loginPlayer[0] === '' || req.body.loginPlayer[1] === '' || req.body.loginPlayer === undefined){
        res.redirect('/auth/login');
    } else {
        let playerName = req.body.loginPlayer[0];
        let pwd = req.body.loginPlayer[1];

        let status = await bdd.loginUser(playerName, pwd);

        if(status === 'username'){
            req.flash('error', "Ce user n'existe pas encore  :(");
            res.redirect('/auth/login');  

        }

        else if(status === 'pwd'){
            req.flash('error', "Mauvais mot de passe  :(");
            res.redirect('/auth/login');  

        }

        else if(status === true){
            req.flash('success', "Salut bonne partie à toi  :)");
            
            const userData = {
                username : playerName
            }
            
            req.session.user = userData;

            res.redirect('/');
        }
    }
});


/* -------------------------------------------------------------------------- */
/*                                  Register                                  */
/* -------------------------------------------------------------------------- */

app.get('/auth/register', (req,res) =>{

    if (req.session.user) {
        reload();
        res.render('auth/register', {data : true});   
    } else {
        reload();
        res.render('auth/register', {data : false});   
    } 
});

app.post('/auth/register', async (req,res)=>{
    if(req.body.paramPlayer[0] === '' || req.body.paramPlayer[1] === ''){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/register');
    } else {
        //console.log(req.body.paramPlayer);

        let name,pwd,status = null;
        name = req.body.paramPlayer[0]; // username
        pwd = req.body.paramPlayer[1]; // password

        status = await bdd.insertUser(name,pwd); // insérer un user unique
        
        if(status == true){
            req.flash('success', "Votre Profil est bien enregistrer  :)"); 
            res.redirect('/');
        } else {
            req.flash('error', "Ce Profil existe déjà  :(");
            res.redirect('/register');
        }
    };
});

/* -------------------------------------------------------------------------- */
/*                                    load                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/load', async (req,res) =>{
    
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        reload();
        res.render('game/load');
    } else {
        destroySession(req,res);
    }
    
});

app.post('/game/load', async(req,res)=>{
    if(req.body.paramGame === ''){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/game/load');
    } else {
        game.name = req.body.paramGame;

        gameExist = await bdd.gameExist(game);

        if(gameExist){
            await bdd.getGame(game);
            gameRunning = true;
            res.redirect('/game/display');
        } else {
            req.flash('error', "Cette partie n'existe pas ou est déjà terminé  :(");
            res.redirect('/game/load');
        }
    };
});

/* -------------------------------------------------------------------------- */
/*                                  Create                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/create', (req,res) =>{
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        reload();
        res.render('game/create', { paramGame : paramGame, gameName : game.name});
    } else {
        destroySession(req,res);
    }
});

app.post('/game/create', async (req,res)=>{
    if(req.body.paramGame[0] === '' || req.body.paramGame[1] === '' || req.body.paramGame[2] === '' ){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/game/create');
    } else {

        game.name = req.body.paramGame[0];

        gameExist = await bdd.gameExist(game);
 
        if(!gameExist){
            req.flash('error', "Cette partie existe déjà  :(");
            res.redirect('/game/create');
        } else {
            req.flash('success', "Cette partie peut être crée. Maintenant renseignons les joueurs :)");
            game.name = req.body.paramGame[0];
            game.end_date = req.body.paramGame[1];
            game.nbPlayer = req.body.paramGame[2];

            const player = new Player();
            player.name = req.session.user.username;
            player.game = game.name;
            game.TableOfPlayers.push(player);

            player.mission = await game.taskRandom(bdd); // on attribue sa mission pour le tuer
            nbAdd ++;

            res.redirect('/game/init');
        }
    };
})

/* -------------------------------------------------------------------------- */
/*                                    init                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/init', async(req,res)=>{
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        res.render('game/init', {nbAdd: nbAdd});
    } else {
        destroySession(req,res);
    }
    
});

app.post('/game/init' ,async(req,res)=>{
    
    if(req.body.nameOfPlayer == '' || req.body.nameOfPlayer == undefined){
        res.redirect('/game/init');
    } else {
        if(nbAdd <= game.nbPlayer){
            let playerName = req.body.nameOfPlayer;
            const user = await bdd.checkPlayer(playerName); // on vérifie si il existe
            
            if(user == false){
                req.flash('error', "ce joueur n'existe pas, veuillez re-esayer");
            } else{
                req.flash('success', "Joueur ajouté, au suivant : ");

                const player = new Player();
                player.name = playerName;
                player.game = game.name;
                game.TableOfPlayers.push(player);

                player.mission = await game.taskRandom(bdd); // on attribue sa mission pour le tuer
                
                nbAdd ++;
            }

            if(nbAdd > game.nbPlayer){
                game.shuffleTableOfPlayers();
                game.targetPlayer();

                await bdd.sendGame(game); //envoie de la game
                await bdd.sendPlayer(game); // envoie des joueurs

                req.flash('success', "Partie crée, bonne game  :)");

                nbAdd = 1;
                
                res.redirect('/');
            } else {
                res.redirect('/game/init');
            }
            
        } else {
            req.flash('error', "Désolé, il y a eu une erreur dans la création de la partie, veuillez recommencer  :)");
            res.redirect('/game/create');
        }
    }
});

/* -------------------------------------------------------------------------- */
/*                                Display                                     */
/* -------------------------------------------------------------------------- */
 
app.get('/game/display', async (req,res) =>{
    if(gameRunning == true || gameRunning == false){
        if (req.session.user && (req.session.cookie.expires > new Date())) {
            gameExist = await bdd.gameExist(game);
            if(!gameExist && gameRunning != null){
                req.flash('error', "erreur dans le chargement de votre partie")
                res.redirect('/game/load');
            } else {
                await bdd.getGame(game);

                data[1] = await bdd.mainPlayerDisplay(game.name,req.session.user.username); console.log(data[1]);
                let targetPlayer = game.TableInGame[data[1]].target;
                data[2] = await bdd.targetPlayerDisplay(game.name,targetPlayer); console.log(data[2]);

                if (gameRunning == false){
                    res.render('game/display', {gameRunning: gameRunning, game : game});
                    await bdd.closeBDD(game); // fermer bdd + suprimer élement superflu
                    gameRunning = null;
                } else {
                    res.render('game/display', { game : game, gameRunning: gameRunning, mainPlayer : data[1], targetPlayer : data[2]});
                }
            }
        } else {
            destroySession(req,res);
        }
    } else {
        res.redirect('/');
    }
});

app.post('/game/display', async(req,res)=>{
    
    if(req.body.mort != '' && req.body.mort != undefined){
        
        if(req.body.mort == 'kill'){
            gameRunning = await game.kill(bdd,data); // update les joueurs après kill
        }
        if(gameRunning == false){
            req.flash('success', "GG " + game.winner + ", tu es le killer ultime !")
        } else {
            if(req.body.mort != 'kill'){
                req.flash('error', "Vous n'avez pas bien écrit 'kill'");
            } else {
                req.flash('succes', "Le joueur" + game.TableInGame[data[2]].name + " est mort !")
            }
        }
    }
    res.redirect('/game/display');
});


app.listen(8080, async () => {
    await bdd.setupBDD(); // démarer la bdd
});


/* -------------------------------------------------------------------------- */
/*                                  fonction                                  */
/* -------------------------------------------------------------------------- */

async function reload(){
    paramGame = undefined;
    paramPlayer = undefined;
    gameRunning = true;
    gameExist = null;
    nbAdd = 1;
    data = [];
    game.destroy();
}

async function updateData(game,data,req){
   
}
 
function destroySession(req,res){
    if(req.session.user != undefined){
        req.session.destroy((err) => {
            if (err) {
            console.error('Erreur lors de la suppression de la session :', err);
            }
            else {
            console.log("sessions suprimé");
            }
        });
 
        if(req.session.user && (req.session.cookie.expires < new Date())) {  
            destroySession(req);
        }
    }
        reload();
        req.flash('error', "Vous n'êtes pas connnecté  :(");
        res.redirect('/auth/login');
} 