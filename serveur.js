/* -------------------------------------------------------------------------- */
/*                                serveur setup                               */
/* -------------------------------------------------------------------------- */

let express =  require('express');
let app = express();
let ejs =  require('ejs');
let bodyParser = require('body-parser');
let session = require('express-session');

let paramGame, status;
let gameExist = null;

/* -------------------------------------------------------------------------- */
/*                                package setup                               */
/* -------------------------------------------------------------------------- */

const Game = require('./package/Game');
const game = new Game();

const BDD = require('./package/BDD');
const bdd = new BDD();

const Player = require('./package/Player')


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
    if(req.body.paramGame === ''){
        req.flash('error', "Vous n'avez pas posté de message  :(");
        res.redirect('/');
    } else {
        await bdd.setupBDD(); // démarer la bdd
        game.name = req.body.paramGame;

        gameExist = await bdd.gameExist(game);

        if(gameExist){
            await bdd.getGame(game);
            res.redirect('/load');
        } else {
            res.redirect('/create');
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

        res.redirect('/load');
    };
})

/* -------------------------------------------------------------------------- */
/*                                 Routes  get                                */
/* -------------------------------------------------------------------------- */

app.get('/', (req,res) =>{
    res.render('pages/index', { paramGame : paramGame, mode : ""});
    paramGame = undefined;
    status = undefined;
});

app.get('/create', (req,res) =>{
    res.render('pages/index', { paramGame : paramGame, mode : "create", gameName : game.name});
    paramGame = undefined;
});

app.get('/load', (req,res) =>{
    res.render('pages/index', { paramGame : game, mode : "load"});
});


app.listen(8080);