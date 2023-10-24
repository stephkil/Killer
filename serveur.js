/* -------------------------------------------------------------------------- */
/*                                serveur setup                               */
/* -------------------------------------------------------------------------- */
 
let express =  require('express');
let app = express();
let ejs =  require('ejs');
let bodyParser = require('body-parser');
let session = require('express-session');

let paramGame, paramPlayer;
let gameExist = null;
var gameRunning = true;
var nbAdd = 1;

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
    secret: "chut",
    resave: false,
    saveUninitialized : true,
    cookie: { secure: false }
}));

app.use(require('./middlewares/flash'));


/* -------------------------------------------------------------------------- */
/*                                 Route /                                    */
/* -------------------------------------------------------------------------- */

app.post('/', async(req,res)=>{
    res.redirect('/');
});

app.get('/', async (req,res) =>{
    reload();
    res.render('index');
});

/* -------------------------------------------------------------------------- */
/*                                  login                                     */
/* -------------------------------------------------------------------------- */

app.get('/auth/login', (req,res)=>{
    reload();
    res.render('auth/login', { bdd : bdd});
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
            res.redirect('/');
        }
    }
});
/* -------------------------------------------------------------------------- */
/*                                  Register                                  */
/* -------------------------------------------------------------------------- */

app.get('/auth/register', (req,res) =>{
    reload();
    res.render('auth/register');
});

app.post('/register', async (req,res)=>{
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
    reload();
    res.render('game/load');
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
            res.redirect('/game/affi');
        } else {
            req.flash('error', "Cette partie n'existe pas  :(");
            res.redirect('/game/load');
        }
    };
});

/* -------------------------------------------------------------------------- */
/*                                  Create                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/create', (req,res) =>{
    reload();
    res.render('game/create', { paramGame : paramGame, gameName : game.name});
});

app.post('/game/create', async (req,res)=>{
    if(req.body.paramGame[0] === '' || req.body.paramGame[1] === '' || req.body.paramGame[2] === '' ){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/game/create');
    } else {

        game.name = req.body.paramGame[0];

        gameExist = await bdd.gameExist(game);

        if(gameExist){
            req.flash('error', "Cette partie existe déjà  :(");
            res.redirect('/game/create');
        } else {
            req.flash('success', "Cette partie peut être crée. Maintenant renseignons les joueurs :)");
            game.name = req.body.paramGame[0];
            game.end_date = req.body.paramGame[1];
            game.nbPlayer = req.body.paramGame[2];

            res.redirect('/game/init');
        }
    };
})

/* -------------------------------------------------------------------------- */
/*                                    init                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/init', async(req,res)=>{
    res.render('/game/init', {nbAdd: nbAdd});
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

app.post('/game/display', async(req,res)=>{

    if(req.body.mort != '' && req.body.mort != undefined){

        let killed = Number(req.body.mort); // mettre en forme
        gameRunning = await game.kill(killed,bdd); // update les joueurs après kill

        if(gameRunning == false){
            //console.log(game);
            req.flash('success', "GG " + game.winner + ", tu es le killer ultime !")
        } else {
            req.flash('succes', "Le joueur" + game.TableInGame[killed].name + " est mort !")
        }
    }
    res.redirect('/game/display');
});


app.get('/game/display', async (req,res) =>{
    res.render('game/display', { game : game, gameRunning: gameRunning});

    if(gameRunning == false){
        await bdd.closeBDD(game); // fermer bdd + suprimer élement superflu
    }
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
    game.destroy();
}
