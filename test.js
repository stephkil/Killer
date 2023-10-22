let express =  require('express');
let app = express();
let ejs =  require('ejs');
let bodyParser = require('body-parser');
let session = require('express-session');

let mess;


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
    res.render('pages/index', {test : mess});
});

app.post('/', (req,res)=>{
    if(req.body.message === undefined || req.body.message === ''){
        req.flash('error', "Vous n'avez pas posté de message  :(");
    } else {
        req.flash('success', "Merci pour votre votre message  :)");
        mess = req.body.message;
        };
    
    res.redirect('/');
    }
);

app.listen(8080);