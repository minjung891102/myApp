// import modules
var mongoose = require('mongoose');

// model setting
var postSchema = mongoose.Schema({
  title : {type:String, require:true},
  body : {type:String, require:true},
  author : {type:mongoose.Schema.Types.ObjectId, ref:'user', required:true}, //ref:'user'를 통해서 user collection을 가리키고 있는 걸 알려줌
  createdAt : {type:Date, default:Date.now},
  updatedAt : Date
});
var Post = mongoose.model('post', postSchema);

postSchema.methods.getCreatedDate = function () {
  var date = this.createdAt;
  return date.getFullYear() + "-" + get2digits(date.getMonth()+1)+ "-" + get2digits(date.getDate());
};

postSchema.methods.getCreatedTime = function () {
  var date = this.createdAt;
  return get2digits(date.getHours()) + ":" + get2digits(date.getMinutes())+ ":" + get2digits(date.getSeconds());
};
function get2digits(num){
  return ("0" + num).slice(-2);
}

module.exports = Post;
