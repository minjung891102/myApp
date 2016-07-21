// import modules
var express  = require('express');
var router   = express.Router();
var mongoose = require('mongoose');
var User     = require('../models/User');
var async    = require('async');

//set user routes
router.get('/new', function(req,res) {
  res.render('users/new', {
                            formData : req.flash('formData')[0],
                            emailError : req.flash('emailError')[0],
                            nicknameError : req.flash('nicknameError')[0],
                            passwordError : req.flash('passwordError')[0]
                          }
  );
}); //new
router.post('/', checkUserRegValidation, function(req,res,next) {
  User.create(req.body.user, function(err,user) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/login');
  });
}); //create
router.get('/:id', isLoggedIn, function(req,res) {
  User.findById(req.params.id, function(err,user) {
    if(err) return res.json({success:false, message:err});
    res.render("users/show", {user:user});
  });
}); //show
router.get('/:id/edit', isLoggedIn, function(req,res) {
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
router.put('/:id', isLoggedIn, checkUserRegValidation, function(req,res) {
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
        //  위의 코드의 경우 newPassword가 있는 경우에 user.save()가 호출되고 req.body.user.password의 값이 다시 User.findByIdAndUpdate에서 사용되므로 다음번 로그인 시에 문제발생
        req.body.user.password = user.hash(req.body.user.newPassword);
        // req.body.user.newPassword가 있는 경우에는 req.body.user.newPassword를 hash해서 넣어주고, 없는 경우는 req.body.user.password를 지웁니다.
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

module.exports = router;
