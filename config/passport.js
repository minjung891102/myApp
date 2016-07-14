// import modules
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User          = require('../models/User');

// set middlewares
passport.serializeUser(function(user,done) {
  done(null, user.id); //user.id : username이 아니라 DB의 id
});
passport.deserializeUser(function(id,done) {
  User.findById(id, function(err,user) {
    done(err,user); //이렇게 가져온 user는 req.user에서 session이 유지되고 있는 동안에 언제든지 접근 가능
  });
});

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

module.exports = passport;
