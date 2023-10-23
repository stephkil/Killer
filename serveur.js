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
/*                              Routes  post                                  */
/* -------------------------------------------------------------------------- */

app.post('/', async(req,res)=>{
    res.redirect('/');
});

app.post('/load', async(req,res)=>{
    if(req.body.paramGame === ''){
        req.flash('error', "Vous n'avez pas posté de message  :(");
        res.redirect('/');
    } else {
        game.name = req.body.paramGame;

        gameExist = await bdd.gameExist(game);

        if(gameExist){
            await bdd.getGame(game);
            res.redirect('/affi');
        } else {
            req.flash('error', "Cette partie n'existe pas  :(");
            res.redirect('/load');
        }
    };
});

app.post('/create', async (req,res)=>{
    if(req.body.paramGame[0] === '' || req.body.paramGame[1] === '' || req.body.paramGame[2] === '' ){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/create');
    } else {
        req.flash('success', "Votre Partie est bien enregistrer  :)");
        game.name = req.body.paramGame[0];
        game.end_date = req.body.paramGame[1];
        game.nbPlayer = req.body.paramGame[2];

        await bdd.sendGame(game); //envoie de la game

        res.redirect('/affi');
    };
})

app.post('/register', async (req,res)=>{
    if(req.body.paramPlayer[0] === '' || req.body.paramPlayer[1] === ''){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/register');
    } else {
        console.log(req.body.paramPlayer);

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
/*                                 Routes  get                                */
/* -------------------------------------------------------------------------- */

app.get('/', async (req,res) =>{
    res.render('pages/index');
    paramGame = undefined;
});

app.get('/create', (req,res) =>{
    res.render('pages/create', { paramGame : paramGame, gameName : game.name});
    paramGame = undefined;
});

app.get('/load', async (req,res) =>{
    res.render('pages/load', { paramGame : paramGame});
});

app.get('/affi', (req,res) =>{
    res.render('pages/affi', { paramGame : game});
});

app.get('/register', (req,res) =>{
    res.render('pages/register', { paramPlayer : paramPlayer});
});

app.listen(8080, async () => {
    await bdd.setupBDD(); // démarer la bdd
});
