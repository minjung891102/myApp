// import modules -----------------------------------------------------------------------------------
var express        = require('express');
var app            = express();
var path           = require('path');
var mongoose       = require('mongoose');
var session        = require('express-session');
var flash          = require('connect-flash');
var bodyParser     = require('body-parser');
var cookieParser   = require('cookie-parser');
var methodOverride = require('method-override');



// database -----------------------------------------------------------------------------------
mongoose.connect(process.env.MONGOOSE_DB);
var db = mongoose.connection;
db.once("open", function (){
  console.log("DB connected!");
});
db.on("error", function (error) {
  console.log("DB ERROR : ", err);
});



// view engine -----------------------------------------------------------------------------------
app.set("view engine", 'ejs');



// middlewares -----------------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
// use라는 api를 사용하여 express의 정적서비스를 app.js에서 사용할 수 있도록 연결시키자.
// public 디렉토리 안의 정적인 파일들을 직접적으로 사용할 수 있게 하는 코드
app.use(bodyParser.json());
//다른프로그램 -> json 으로 데이타전송 할 경우 받는 body parser
app.use(bodyParser.urlencoded({extended:true}));
//웹사이트 -> json 으로 데이타전송 할 경우 받는 body parser
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(flash());
app.use(session({
  secret:'MySecret',
  resave: true,
  saveUninitialized: true
}));
app.use(countVisitors);



// passport -----------------------------------------------------------------------------------
var passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());



// routes -----------------------------------------------------------------------------------
app.use('/', require('./routes/home'));
app.use('/users', require('./routes/users'));
app.use('/posts', require('./routes/posts'));



// start server -----------------------------------------------------------------------------------
var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log('Server On!');
});



function countVisitors(req, res, next) {
  if(!req.cookies.count && req.cookies['connect.sid']) {
    res.cookie('count',"", {maxAge:3600000, httpOnly:true});
    var now = new Date();
    var date = now.getFullYear() + "/" + now.getMonth + "/" + now.getDate();
    if(date != req.cookies.countDate) {
      res.cookie('countDate', date, {maxAge:86400000, httpOnly:true});

      var Counter = require('./models/Counter');
      Counter.findOne({name:"visitors"}, function(err,counter) {
        if(err) return next();
        if(counter===null) {
          Counter.create({name:"visitors", totalCount:1, todayCount:1, date:date});
        } else {
          counter.totalCount++;
          if(counter.date == date) {
            counter.todayCount++;
          } else {
            counter.todayCount = 1;
            counter.date = date;
          }
          counter.save();
        }
      });
    }
  }
  return next();
}
