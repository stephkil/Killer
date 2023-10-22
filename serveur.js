/* -------------------------------------------------------------------------- */
/*                                serveur setup                               */
/* -------------------------------------------------------------------------- */

let express =  require('express');
let app = express();
let ejs =  require('ejs');
let bodyParser = require('body-parser');
let session = require('express-session');

let paramGame, status;

/* -------------------------------------------------------------------------- */
/*                                package setup                               */
/* -------------------------------------------------------------------------- */

const Game = require('./package/Game');
const game = new Game();

const BDD = require('./package/BDD');
const bdd = new BDD();

const Player = require('./package/Player')


/* -------------------------------------------------------------------------- */
/*                               question setup                               */
/* -------------------------------------------------------------------------- */

const readline = require('readline');

const rl = readline.createInterface({ // pour demander du texte
    input: process.stdin,
    output: process.stdout
  });

function ask(question) { // attendre la réponse
    return new Promise((resolve) => {
        rl.question(question, (response) => resolve(response.trim()));
    });
}



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

app.post('/', (req,res)=>{
    if(req.body.paramGame === ''){
        req.flash('error', "Vous n'avez pas posté de message  :(");
        res.redirect('/');
    } else {
        game.name = req.body.paramGame;
        res.redirect('/create');
    };
});

app.post('/create', (req,res)=>{
    if(req.body.paramGame[0] === '' || req.body.paramGame[1] === '' || req.body.paramGame[2] === '' ){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/create');
    } else {
        req.flash('success', "Merci pour votre votre message  :)");
        paramGame = req.body.paramGame;
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
    res.render('pages/index', { paramGame : paramGame, mode : "load"});
    
});


app.listen(8080);


/* -------------------------------------------------------------------------- */
/*                                    main                                    */
/* -------------------------------------------------------------------------- */


async function main() {

    await bdd.setupBDD(); // démarer

}

main();


