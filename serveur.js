
let express =  require('express');
let app = express();
let ejs =  require('ejs');
let bodyParser = require('body-parser');
let session = require('express-session');

let paramGame;

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
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

app.get('/', (req,res) =>{
    res.render('pages/index', { paramGame : paramGame});
    paramGame = undefined;
});

app.post('/', (req,res)=>{
    if(req.body.paramGame === undefined || req.body.paramGame === ''){
        req.flash('error', "Vous n'avez pas posté de message  :(");
    } else {
        req.flash('success', "Merci pour votre votre message  :)");
        paramGame = req.body.paramGame;
        };

    console.log(req.body);
    res.redirect('/');
    }
);

app.listen(8080);