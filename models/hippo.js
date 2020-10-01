var mongoose=require("mongoose")
var Schema=mongoose.Schema

var hippoSchema =new Schema({
    lastMineUp : {type : Object},
    lastMineDown : {type : Object},
    mineAmount : {type : String},
    mineMetrics : {type : Boolean},
    bank : {type:String},
    name:{type:String},
    bvn : {type:String},
    accountNumber : {type:String},
    dateMined : {type:Date},
    dump :{type : Object},
    bankCode : {type : String}
})

module.exports=mongoose.model("hippo",hippoSchema)