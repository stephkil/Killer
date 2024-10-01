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
 

app.use('/assets', express.static('public'));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.use(require('./middlewares/session'));
app.use(require('./middlewares/flash'));


/* -------------------------------------------------------------------------- */
/*                                 Route /                                    */
/* -------------------------------------------------------------------------- */

app.get('/', (req,res) =>{
    if(req.session.user && (req.session.cookie.expires < new Date())) {  
        destroySession(req,res);
    }
    reload();
    res.render('index', {data : req.session});
});

app.post('/', (req,res)=>{
    res.redirect('/');
});

/* -------------------------------------------------------------------------- */
/*                                Disconnect                                  */
/* -------------------------------------------------------------------------- */

app.get('/auth/disconnect', (req,res)=>{   
    req.session.destroy();
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
            //req.flash('success', "Salut bonne partie à toi  :)");
            
            const userData = {
                username : playerName
            }
            req.session.user = userData;

            console.log(req.session.user);

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
        res.redirect('/auth/register');
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
            res.redirect('/auth/register');
        }
    };
});


/* -------------------------------------------------------------------------- */
/*                                   Friend                                   */
/* -------------------------------------------------------------------------- */

app.get('/friend', async (req,res)=> {
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        reload();
        var friend =  await bdd.getFriend(req.session.user.username);
        //console.log("friend : " + friend)
        res.render('friend', {listOfFriend : friend});
    } else {
        destroySession(req,res);
    }
});

app.post('/friend', async (req,res)=> {
    let friend = req.body.nameOfFriend;
  
    const user = await bdd.checkPlayer(friend); // on vérifie si il existe
    
    if(user == false){
        req.flash('error', "ce joueur n'existe pas, veuillez re-essayer");
    } else{
        req.flash('success', "Joueur ajouté ");
        await bdd.addFriend(user,req.session.user.username);
    }
    res.redirect('/friend');
});

app.post('/delete-friend', async (req,res)=> {

    let del = req.body.del;
    //console.log(del);

    req.flash('success', "Joueur suprimé");
    await bdd.delFriend(del,req.session.user.username);

    res.redirect('/friend');
});

/* -------------------------------------------------------------------------- */
/*                                    load                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/load', async (req,res) =>{
    
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        reload();
        let allGame = await bdd.allGame(req.session.user.username);
        //console.log("allGame : " + allGame);
        res.render('game/load', {name : allGame});
    } else {
        destroySession(req,res);
    }
    
});
 
app.post('/game/load', async(req,res)=>{
    game.name = req.body.gameName;
    gameExist = await bdd.gameExist(game);

    if(gameExist){
        await bdd.getGame(game);
        gameRunning = true;
        res.redirect('/game/display');
    } else {
        req.flash('error', "Cette partie n'existe pas ou est déjà terminé  :(");
        res.redirect('/game/load');
    }
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
    console.log(req.body);

    if(req.body.paramGame == '' || req.body.paramDate === ''){
        req.flash('error', "Vous n'avez pas tous bien renseigné  :(");
        res.redirect('/game/create');
    } else {
        game.name = req.body.paramGame;

        gameExist = await bdd.gameExist(game);
 
        if(gameExist){
            req.flash('error', "Cette partie existe déjà  :(");
            res.redirect('/game/create');
        } else {
            req.flash('success', "Cette partie peut être crée :)");
            game.name = req.body.paramGame;
            game.nbPlayer++;
            
            game.end_date = req.body.paramDate;

            const player = new Player();
            player.name = req.session.user.username;
            player.game = game.name;
            player.idPlayer = game.nbPlayer;

            game.TableOfPlayers.push(player);

            player.mission = await game.taskRandom(bdd); // on attribue sa mission pour le tuer
            
            res.redirect('/game/init');
        }
    };
})


/* -------------------------------------------------------------------------- */
/*                                    init                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/init', async(req,res)=>{
    console.log(game.TableOfPlayers);
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        var friend =  await bdd.getFriend(req.session.user.username);
        res.render('game/init', {game: game, listOfFriend : friend});
    } else {
        destroySession(req,res);
    }
    
});

app.post('/game/init' ,async(req,res)=>{
    
    let answer = req.body.answer;
    console.log("answer : " + answer);

    if(answer == 'start'){
        game.shuffleTableOfPlayers();
        game.targetPlayer();

        await bdd.sendGame(game); //envoie de la game
        await bdd.sendPlayer(game); // envoie des joueurs

        req.flash('success', "Partie crée, bonne game  :)");
        
        res.redirect('/');
    }
    else {
        const user = await bdd.checkPlayer(answer); // on vérifie si il existe
        
        if(user == false){
            req.flash('error', "ce joueur n'existe pas/plus, veuillez re-esayer");
        } else{
            req.flash('success', "Joueur ajouté, au suivant : ");

            const player = new Player();
            player.name = answer;
            player.game = game.name;
            player.idPlayer = game.nbPlayer;

            game.TableOfPlayers.push(player);
            player.mission = await game.taskRandom(bdd); // on attribue sa mission pour le tuer
    
            game.nbPlayer ++;
        }
        res.redirect('/game/init');
    }
});

/* -------------------------------------------------------------------------- */
/*                                Display                                     */
/* -------------------------------------------------------------------------- */
  
app.get('/game/display', async (req,res) =>{
    if(gameRunning == true){
        if (req.session.user && (req.session.cookie.expires > new Date())) {
            gameExist = await bdd.gameExist(game);
            if(!gameExist){
                req.flash('error', "erreur dans le chargement de votre partie")
                res.redirect('/game/load');
            } else {
                await bdd.getGame(game);

                if (gameRunning == false){
                    res.redirect('/game/endScreen');
                } else {

                    const now = new Date(); // Date actuelle
                    const startDate = new Date(game.start_date); // Date de début du jeu
                    const endDate = new Date(game.end_date); // Date de fin du jeu

                    const totalMillisecondsInGame = endDate - startDate; // Durée totale du jeu en millisecondes
                    const millisecondsElapsed = now - startDate; // Millisecondes écoulées depuis le début du jeu

                    const progression = (millisecondsElapsed / totalMillisecondsInGame) * 100;
                    
                    console.log(now);
                    console.log(startDate);
                    console.log(endDate);

                    console.log(progression);

                    let TableShuffle = shuffle([...game.TableInGame]);
                    
                    data[1] = await bdd.mainPlayerDisplay(game.name,req.session.user.username);
                    let targetPlayer = game.TableInGame[data[1]].target;
                    data[2] = await bdd.targetPlayerDisplay(game.name,targetPlayer);

                    //console.log(targetPlayer);

                    res.render('game/display', { 
                        game : game, 
                        gameRunning: gameRunning, 
                        mainPlayer : data[1], targetPlayer : data[2],  
                        TableShuffle : TableShuffle,
                        username : req.session.user.username,
                        remaining : progression
                    });
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
            req.flash('success', "GG " + game.winner + ", tu es le killer ultime !");
            res.redirect('/game/endScreen');
        } else {
            if(req.body.mort != 'kill'){
                req.flash('error', "Vous n'avez pas bien écrit 'kill'");
            } else {
                req.flash('succes', "Le joueur" + game.TableInGame[data[2]].name + " est mort !")
            }
            res.redirect('/game/display');
        }
    } else {
        res.redirect('/game/display');
    }
   
});

/* -------------------------------------------------------------------------- */
/*                            Display end of screen                           */
/* -------------------------------------------------------------------------- */

app.get('/game/endScreen', async (req,res) =>{
    await bdd.closeBDD(game); // fermer bdd + suprimer élement superflu
    res.render('game/endScreen', {game : game});
});


/* -------------------------------------------------------------------------- */
/*                                 Historique                                 */
/* -------------------------------------------------------------------------- */

app.get('/game/historique', async (req,res) =>{
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        var histo = []
        histo = await bdd.getHisto(req.session.user.username);
        if(histo == ''){
            req.flash('error', "Vous n'avez pas encore joué de partie :(");
            res.redirect('/')
        } else {
    

        res.render('game/historique', {games: histo})
        }
    } else {
        destroySession(req,res);
    }
});
 

/* -------------------------------------------------------------------------- */
/*                                   listen                                   */
/* -------------------------------------------------------------------------- */

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
    data = [];
    game.destroy();
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
    }
        reload();
        req.flash('error', "Vous n'êtes pas connnecté  :(");
        res.redirect('/auth/login');
} 

function shuffle(TableInGame) {
    TableShuffle = TableInGame;
    for (let i = TableShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [TableShuffle[i], TableShuffle[j]] = [TableShuffle[j], TableShuffle[i]]; // Échange des éléments
    }
    return TableShuffle;
}