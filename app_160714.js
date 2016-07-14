// import modules
var express = require('express');
var path = require('path');
var app = express();
var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');
var async = require('async');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

// connect database
mongoose.connect(process.env.MONGOOSE_DB);
var db = mongoose.connection;
db.once("open", function (){
  console.log("DB connected!");
});
db.on("error", function (error) {
  console.log("DB ERROR : ", err);
});
var dataSchema = mongoose.Schema({
  name:String,
  count:Number
});
var Data = mongoose.model('data', dataSchema);
Data.findOne({name:"myData"}, function(err,data) {
  if(err) return console.log("Data ERROR : ", err);
  if(!data) {
    Data.create({name:"myData",count:0}, function (err,data) {
      if(err) return console.log("Data ERROR : ", err);
      console.log("Counter initialized : ", data);
    });
  }
});

// model setting
var postSchema = mongoose.Schema({
  title : {type:String, require:true},
  body : {type:String, require:true},
  author : {type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  //ref:'user'를 통해서 user collection을 가리키고 있는 걸 알려줌
  createdAt : {type:Date, default:Date.now},
  updatedAt : Date
});
var Post = mongoose.model('post', postSchema);

var bcrypt = require("bcrypt-nodejs");
var userSchema = mongoose.Schema({
  email : {type:String, require:true, unique:true},
  nickname : {type:String, require:true, unique:true},
  password : {type:String, require:true},
  createdAt : {type:Date, default:Date.now}
});
userSchema.pre("save", function (next) {
  var user = this;
  if(!user.isModified("password")) {
    return next();
  } else {
    user.password = bcrypt.hashSync(user.password);
    return next();
  }
});
userSchema.methods.authenticate = function(password) {
  var user = this;
  return bcrypt.compareSync(password, user.password);
};
var User = mongoose.model('user', userSchema);

// view setting
app.set("view engine", 'ejs');

// set middlewares
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
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user,done) {
  done(null, user.id); //user.id : username이 아니라 DB의 id
});
passport.deserializeUser(function(id,done) {
  User.findById(id, function(err,user) {
    done(err,user);
    //이렇게 가져온 user는 req.user에서 session이 유지되고 있는 동안에 언제든지 접근 가능
  });
});

var LocalStrategy = require('passport-local').Strategy;
passport.use('local-login',
  new LocalStrategy({
      usernameField : 'email',
      passwordField : 'password',
      passReqToCallback : true
    },
    function(req, email, password, done) {
      User.findOne({'email' :  email}, function(err,user) {
        if (err) return done(err);

        if (!user){
            req.flash("email", req.body.email);
            return done(null, false, req.flash('loginError', 'No user found.'));
        }
        //if (user.password != password){
        //db에 hash가 저장되므로 password 확인을 password == user.password로 사용할 수 없고 user.authenticate()를 사용
        if (!user.authenticate(password)){
            req.flash("email", req.body.email);
            return done(null, false, req.flash('loginError', 'Password does not Match.'));
        }
        return done(null, user);
      });
    }
  )
);

//set home routes
app.get('/', function(req,res) {
  res.redirect('/posts');
});
app.get('/login', function(req,res) {
  res.render('login/login', {email:req.flash("email")[0], loginError:req.flash('loginError')});
});
app.post('/login',
  function(req,res,next) {
    req.flash("email"); //flush email data
    if(req.body.email.length === 0 || req.body.password.length === 0) {
      req.flash("email", req.body.email);
      req.flash("loginError", "Please enter both email and password.");
      res.redirect('/login');
    } else {
      next();
    }
  }, passport.authenticate('local-login', {
    successRedirect : '/posts',
    failureRedirect : '/login',
    failureFlash : true
  })
);
app.get('/logout', function(req,res) {
  req.logout();
  res.redirect('/');
});

//set user routes
app.get('/users/new', function(req,res) {
  res.render('users/new', {
                            formData : req.flash('formData')[0],
                            emailError : req.flash('emailError')[0],
                            nicknameError : req.flash('nicknameError')[0],
                            passwordError : req.flash('passwordError')[0]
                          }
  );
}); //new
app.post('/users', checkUserRegValidation, function(req,res,next) {
  User.create(req.body.user, function(err,user) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/login');
  });
}); //create
app.get('/users/:id', isLoggedIn, function(req,res) {
  User.findById(req.params.id, function(err,user) {
    if(err) return res.json({success:false, message:err});
    res.render("users/show", {user:user});
  });
}); //show
app.get('/users/:id/edit', isLoggedIn, function(req,res) {
  if(req.user._id != req.params.id) return res.json({success:false, message:"Unauthrized Attempt"});
  User.findById(req.params.id, function(err,user) {
    if(err) return res.json({success:false, message:err});
    res.render("users/edit", {
                              user : user,
                              formData : req.flash('formData')[0],
                              emailError : req.flash('emailError')[0],
                              nicknameError : req.flash('nicknameError')[0],
                              passwordError : req.flash('passwordError')[0]
                            }
    );
  });
}); //edit
app.put('/users/:id', isLoggedIn, checkUserRegValidation, function(req,res) {
  if(req.user._id != req.params.id) return res.json({success:false, message:"Unautherized Attempt"});
  User.findById(req.params.id, req.body.user, function(err,user) {
    if(err) return res.json({success:"false", message:err});
    //if(req.body.user.password == user.password) {
    //마찬가지로 authenticate 사용해서 password 비교
    if(user.authenticate(req.body.user.password)) {
      if(req.body.user.newPassword) {
        //1. req.body.user.password = req.body.user.newPasword;
        //   findByIdAndupdate는 user.save()를 사용하지 않기 때문에, user 개체에 직접 newPassword를 입력해 주고 user.save() 사용
        //2. user.password = req.body.user.newPassword;
        //   user.save();
        //   위의 코드의 경우 newPassword가 있는 경우에 user.save()가 호출되고 req.body.user.password의 값이 다시 User.findByIdAndUpdate에서 사용되므로 다음번 로그인 시에 문제발생
        req.body.user.password = user.hash(req.body.user.newPassword);
        // /req.body.user.newPassword가 있는 경우에는 req.body.user.newPassword를 hash해서 넣어주고, 없는 경우는 req.body.user.password를 지웁니다.
      } else {
        delete req.body.user.password;
      }
      User.findByIdAndUpdate(req.params.id, req.body.user, function (err,user) {
        if(err) return res.json({success:"false", message:err});
        res.redirect('/users/' + req.params.id);
      });
    } else {
      req.flash("formData", req.body.user);
      req.flash("passwordError", " - Invalid password");
      res.redirect('/users/' + req.params.id + "/edit");
    }
  });
}); //update

// set posts routes
app.get('/posts', function(req,res) {
 Post.find({}).populate("author").sort('-createdAt').exec(function (err,post) {
   if(err) return res.json({success:false, message:err});
   res.render("posts/index", {post:post, user:req.user});
 });
}); // index
app.get('/posts/new', isLoggedIn, function(req,res) {
  res.render("posts/new", {user:req.user});
}); //new
app.post('/posts', isLoggedIn, function(req,res) {
  req.body.post.author = req.user._id;
  Post.create(req.body.post, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
  });
}); // create
app.get('/posts/:id', function(req,res) {
 Post.findById(req.params.id).populate("author").exec(function (err,post) {
   if(err) return res.json({success:false, message:err});
   res.render("posts/show", {post:post, user:req.user});
 });
}); // show
app.get('/posts/:id/edit', isLoggedIn, function(req,res) {
  Post.findById(req.params.id, function(err,post) {
    if(err) return res.json({success:false, message:err});
    if(!req.user._id.equals(post.author)) return res.json({success:false, message:"Unautherized Attempt"});
    res.render("posts/edit", {post:post});
  });
}); //edit
app.put('/posts/:id', isLoggedIn, function(req,res) {
  req.body.post.updatedAt=Date.now();
  Post.findByIdAndUpdate({_id:req.params.id, author:req.params._id}, req.body.post, function (err,post) {
    if(err) return res.json({success:false, message:err});
    if(!post) return res.json({success:false, message:"No data found to update"});
    res.redirect("/posts/" + req.params.id);
  });
}); //update
app.delete('/posts/:id', function(req,res) {
  Post.findByIdAndRemove({_id:req.params.id, author:req.params._id}, function (err,post) {
    if(err) return res.json({success:false, message:err});
    if(!post) return res.json({success:false, message:"No data found to delete"});
    res.redirect('/posts');
  });
}); //destroy

//functions
function isLoggedIn(req,res,next) {
  //req.isAuthenticated()를 사용해서 현재 로그인이 되어 있는 상태인지 아닌지를 알려주는 함수로, passport에 의해 제공
  //로그인이 되어 있으면 다음 함수로 진행하고, 안되어 있으면 시작화면으로 보냅니다.
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

function checkUserRegValidation(req,res,next) {
  var isValid = true;

  async.waterfall(
    [function(callback) {
      User.findOne({email : req.body.user.email, _id : {$ne:mongoose.Types.ObjectId(req.params.id)}},
        function(err,user) {
          if(user) {
            isValid = false;
            req.flash("emailError"," - This email is already resistered.");
          }
          callback(null, isValid);
        }
      );
    }, function(isValid, callback) {
        User.findOne({nickname : req.body.user.nickname, _id : {$ne:mongoose.Types.ObjectId(req.params.id)}},
          function(err,user) {
            if(user) {
              isValid = false;
              req.flash("nicknameError", " - This niackname is already resistered.");
            }
            callback(null, isValid);
          }
        );
      }
    ], function(err, isValid) {
      if(err) return res.json({success:"false", message:err});
      if(isValid) {
        return next();
      } else {
          req.flash("formData", req.body.user);
          res.redirect("back");
      }
    }
  );
}

// start server
app.listen(3000, function() {
  console.log('Server On!');
});
