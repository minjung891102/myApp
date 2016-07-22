// import modules -----------------------------------------------------------------------------------
var mongoose = require('mongoose');

// model setting -----------------------------------------------------------------------------------
var counterSchema = mongoose.Schema({
  name : {type:String, require:true},
  totalCount : {type:Number, require:true},
  todayCount : {type:Number},
  date : {type:String}
});
var Counter = mongoose.model('counter', counterSchema);

module.exports = Counter;
