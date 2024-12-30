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
let TableShuffle;
let ShuffleGame = true;
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

        if(playerName.length > 20 || pwd.length > 20){
            req.flash('error', "nom ou mot de passe trop long");
            res.redirect('/auth/login');
        } else {
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

                console.log("session.user : ", req.session.user);

                res.redirect('/');
            }
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

        if(name.length > 20 || pwd.length > 40){
            req.flash('error', "nom ou mot de passe trop long");
            res.redirect('/auth/register');
        } else {
            status = await bdd.insertUser(name,pwd);
            
            if(status == true){
                req.flash('success', "Votre Profil est bien enregistrer  :)"); 
                res.redirect('/auth/login');
            } else {
                req.flash('error', "Ce Profil existe déjà  :(");
                res.redirect('/auth/register');
            }
        }
    };
});


/* -------------------------------------------------------------------------- */
/*                                   Friend                                   */
/* -------------------------------------------------------------------------- */

app.get('/friend', async (req,res)=> {
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        reload();
        var friends =  await bdd.getFriend(req.session.user.username);
        res.render('friend', {listOfFriend : friends});
    } else {
        destroySession(req,res);
    }
});

app.post('/friend', async (req,res)=> {
    let friend = req.body.nameOfFriend;
    
    if(friend.length > 20 ){
        req.flash('error', "nom trop long");
        res.redirect('/auth/friend');
    } else {

        const user = await bdd.checkPlayer(friend);
        
        if(user.username == req.session.user.username){
            req.flash('error', "Vous ne pouvez pas vous ajouter vous même ;)");
        } else {

            if(user == false){
                req.flash('error', "ce joueur n'existe pas");
            } else{

                var friends =  await bdd.getFriend(req.session.user.username);
                let exist = friends.includes(user.username);

                if(exist){
                    console.log("deja ami");
                    req.flash('error', "ce joueur est déjà parmis vos amis");
                } else {
                    console.log("nouvel ami");
                    await bdd.addFriend(user.username,req.session.user.username);
                    req.flash('success', "Joueur ajouté ");
                }
            }
        }
    }
    res.redirect('/friend');
});

app.post('/delete-friend', async (req,res)=> {

    let del = req.body.del;
    console.log("delete friend : ", del);

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
        
        if(req.body.paramGame > 40){
            req.flash('error', "nom ou mot de passe trop long");
            res.redirect('/auth/create');
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
                
                res.redirect('/game/init');
            }
        }
    };
})


/* -------------------------------------------------------------------------- */
/*                                    init                                    */
/* -------------------------------------------------------------------------- */

app.get('/game/init', async(req,res)=>{
    console.log(game.TableOfPlayers);
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        var friend =  await bdd.getListOfFriend(req.session.user.username);
        res.render('game/init', {game: game, listOfFriend : friend});
    } else {
        destroySession(req,res);
    }
    
});

app.post('/game/init' ,async(req,res)=>{
    
    let answer = req.body.answer;
    console.log("answer : " + answer);

    if(answer == 'next'){
        game.shuffleTableOfPlayers();
        game.targetPlayer();
        
        res.redirect('/game/task');
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
    
            game.nbPlayer ++;
        }
        res.redirect('/game/init');
    }
});



/* -------------------------------------------------------------------------- */
/*                                 Task                                       */
/* -------------------------------------------------------------------------- */

app.get('/game/task', async(req,res)=>{
    console.log(game.TableOfPlayers);
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        const Lists = await game.getDistinctLists(bdd);
        console.log("lists : ", Lists);
        res.render('game/task', {game: game, nbList : Lists.count, list: Lists.lists});
    } else {
        destroySession(req,res);
    }
    
});

app.post('/game/task' ,async(req,res)=>{

    let answer = req.body.answer;
    console.log("answer : " + answer);

    var toggles = req.body.toggle;
    console.log('Toggles sélectionnés:', toggles);

    
    if(answer = 'start'){
        for(var i = 0; i< game.nbPlayer; i++){
            game.TableOfPlayers[i].mission = await game.taskRandom(bdd,toggles); // on attribue sa mission pour le tuer
        }

        await bdd.sendGame(game); //envoie de la game
        await bdd.sendPlayer(game); // envoie des joueurs

        req.flash('success', "Partie crée, bonne game  :)");
        res.redirect('/game/load');
    } else {
        res.redirect('/game/task');
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

                const now = new Date();
                const endDate = new Date(game.end_date);
                const isFinish = endDate - now;

                console.log("isFinish : ", isFinish);

                if(isFinish <= 0){
                    gameRunning = false;
                }

                if (gameRunning == false){
                    res.redirect('/game/endScreen');
                } else {

                    const startDate = new Date(game.start_date); // Date de début du jeu

                    const totalMillisecondsInGame = endDate - startDate; // Durée totale du jeu en millisecondes
                    const millisecondsElapsed = now - startDate; // Millisecondes écoulées depuis le début du jeu

                    const progression = (millisecondsElapsed / totalMillisecondsInGame) * 100;
                    
                    console.log(now);
                    console.log(startDate);
                    console.log(endDate);

                    console.log(progression);

                    console.log("ShuffleGame : ", ShuffleGame);

                    if(ShuffleGame == true){
                        console.log("shuffle display");
                        TableShuffle = shuffle([...game.TableInGame]);
                    } else {
                        console.log("NOT shuffle display");
                        ShuffleGame = true;
                    }
                    
                    data[1] = await bdd.mainPlayerDisplay(game.name,req.session.user.username);
                    let targetPlayer = game.TableInGame[data[1]].target;
                    data[2] = await bdd.targetPlayerDisplay(game.name,targetPlayer);

                    //console.log(targetPlayer);

                    let friends =  await bdd.getListOfFriend(req.session.user.username);
                    
                    //console.log("game : ", game);

                    res.render('game/display', { 
                        game : game, 
                        gameRunning: gameRunning, 
                        mainPlayer : data[1], targetPlayer : data[2],  
                        TableShuffle : TableShuffle,
                        username : req.session.user.username,
                        remaining : progression,
                        friends : friends
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
    
    console.log("req.body :", req.body);
    console.log("data : ", data);

    if(req.body.add_friend_inGame != '' && req.body.mort != "kill" && req.body.mort != "confirmKill" && req.body.mort != "contestKill"){
        console.log("add friend in game");

        let friends =  await bdd.getListOfFriend(req.session.user.username);

        if(req.body.add_friend_inGame == req.session.user.username || friends.includes(req.body.add_friend_inGame)){
            console.log("erreur ajout friend in game");
            req.flash('error', "le joueur n'a pas pu être ajouté");
        } else {
            await bdd.addFriend(req.body.add_friend_inGame,req.session.user.username);
            console.log("nouvel ami in game");
            req.flash('error', "joueur ajouté à vos amis");

        }
        ShuffleGame = false;
        res.redirect('/game/display');
    } else {
        if(req.body.mort != '' && req.body.mort != undefined){
            if(req.body.mort == 'kill'){
                gameRunning = await game.newKill(bdd,data,'confirmation');
            }

            if(req.body.mort == 'confirmKill'){
                gameRunning = await game.kill(bdd,data,game);
            }

            if(req.body.mort == 'contestKill'){
                gameRunning = await game.contestKill(bdd,data,'life');
            }
            
            if(gameRunning == false){
                req.flash('success', "GG " + game.winner + ", tu es le killer ultime !");
                await bdd.getGame(game);
                res.redirect('/game/endScreen');
            } else {
                if(req.body.mort != 'kill'){
                    req.flash('error', "erreur durant le kill, re-esayer");
                } else {
                    req.flash('succes', "Le joueur" + game.TableInGame[data[2]].name + " est mort !")
                }
                res.redirect('/game/display');
            }
        } else {
            res.redirect('/game/display');
        }
    }
});

/* -------------------------------------------------------------------------- */
/*                            Display end of screen                           */
/* -------------------------------------------------------------------------- */

app.get('/game/endScreen', async (req,res) =>{
    console.log("GAME APRES KILL",game);
    await bdd.closeBDD(game);
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
/*                                   profil                                   */
/* -------------------------------------------------------------------------- */

app.get('/profil', async (req,res) =>{
    
    if (req.session.user && (req.session.cookie.expires > new Date())) {
        var user = await bdd.getUser(req.session.user.username);
        const listOfSuccess = await bdd.getSuccess(req.session.user.username);
        await bdd.checkSuccess(req.session.user.username,"","Collectionneur");
        await bdd.checkSuccess(req.session.user.username,"","Jack the Ripper");
        await bdd.checkSuccess(req.session.user.username,bdd,"Invincible");

        res.render('profil', {username: req.session.user.username, infoPlayer: user, success: listOfSuccess});
    } else {
        destroySession(req,res);
    }
    
});
 
app.post('/profil', async(req,res)=>{
    
    
    res.redirect('/auth/disconnect');
});


/* -------------------------------------------------------------------------- */
/*                                   listen                                   */
/* -------------------------------------------------------------------------- */

let PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
    await bdd.setupBDD(); // démarer la bdd
    console.log(`Server running on port ${PORT}`);
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