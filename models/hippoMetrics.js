var mongoose=require("mongoose")
var Schema=mongoose.Schema

var hippoMetricsSchema =new Schema({
    lastMineUp : {type:Object},
    lastMineDown : {type:Object},
    mineAmount : {type:String}
})

module.exports=mongoose.model("hippoMetrics",hippoMetricsSchema)