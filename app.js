// import modules
var express        = require('express');
var app            = express();
var path           = require('path');
var mongoose       = require('mongoose');
var session        = require('express-session');
var flash          = require('connect-flash');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

// database
mongoose.connect(process.env.MONGOOSE_DB);
var db = mongoose.connection;
db.once("open", function (){
  console.log("DB connected!");
});
db.on("error", function (error) {
  console.log("DB ERROR : ", err);
});

// view engine
app.set("view engine", 'ejs');

// middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json()); //다른프로그램 -> json 으로 데이타전송 할 경우 받는 body parser
app.use(bodyParser.urlencoded({extended:true})); //웹사이트 -> json 으로 데이타전송 할 경우 받는 body parser
app.use(methodOverride("_method"));
app.use(flash());
app.use(session({
  secret:'MySecret',
  resave: true,
  saveUninitialized: true
}));

// passport
var passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// routes
app.use('/', require('./routes/home'));
app.use('/users', require('./routes/users'));
app.use('/posts', require('./routes/posts'));

// start server
var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log('Server On!');
});
