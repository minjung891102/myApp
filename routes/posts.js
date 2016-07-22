// import modules -----------------------------------------------------------------------------------
var express  = require('express');
var router   = express.Router();
var mongoose = require('mongoose');
var Post     = require('../models/Post');



// set posts routes -----------------------------------------------------------------------------------
// get 방식
// get을 라우터(길 안내자)로 생각하자
router.get('/', function(req,res){
  var page = Math.max(1,req.query.page);
  var limit = 1;
  Post.count({},function(err,count){
    if(err) return res.json({success:false, message:err});
    var skip = (page-1)*limit;
    var maxPage = Math.ceil(count/limit);
    Post.find().populate("author").sort('-createdAt').skip(skip).limit(limit).exec(function (err,posts) {
      if(err) return res.json({success:false, message:err});
      res.render("posts/index",{
            posts:posts, user:req.user, page:page, maxPage:maxPage, postsMessage:req.flash("postsMessage")[0]
          });
    });
  });
}); // index
router.get('/new', isLoggedIn, function(req,res) {
  res.render("posts/new", {user:req.user});
}); //new
router.post('/', isLoggedIn, function(req,res) {
  req.body.post.author = req.user._id;
  Post.create(req.body.post, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
  });
}); // create
router.get('/:id', function(req,res) {
 Post.findById(req.params.id).populate("author").exec(function (err,post) {
   if(err) return res.json({success:false, message:err});
   res.render("posts/show", {post:post, page:req.query.page, user:req.user});
 });
}); // show
router.get('/:id/edit', isLoggedIn, function(req,res) {
  Post.findById(req.params.id, function(err,post) {
    if(err) return res.json({success:false, message:err});
    if(!req.user._id.equals(post.author)) return res.json({success:false, message:"Unautherized Attempt"});
    res.render("posts/edit", {post:post, user:req.user});
  });
}); //edit
router.put('/:id', isLoggedIn, function(req,res) {
  req.body.post.updatedAt=Date.now();
  Post.findByIdAndUpdate({_id:req.params.id, author:req.params._id}, req.body.post, function (err,post) {
    if(err) return res.json({success:false, message:err});
    if(!post) return res.json({success:false, message:"No data found to update"});
    res.redirect("/posts/" + req.params.id);
  });
}); //update
router.delete('/:id', function(req,res) {
  Post.findByIdAndRemove({_id:req.params.id, author:req.params._id}, function (err,post) {
    if(err) return res.json({success:false, message:err});
    if(!post) return res.json({success:false, message:"No data found to delete"});
    res.redirect('/posts');
  });
}); //destroy



//functions -----------------------------------------------------------------------------------
function isLoggedIn(req,res,next) {
  //req.isAuthenticated()를 사용해서 현재 로그인이 되어 있는 상태인지 아닌지를 알려주는 함수로, passport에 의해 제공
  //로그인이 되어 있으면 다음 함수로 진행하고, 안되어 있으면 시작화면으로 보냅니다.
  if(req.isAuthenticated()) {
    return next();
  }
  req.flash("postsMessage","Please login first.");
  res.redirect('/');
}

module.exports = router;
