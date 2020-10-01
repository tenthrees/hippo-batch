const nuban = require("./cbn/nuban_algo");
const bank_codes = require("./cbn/digit_codes");

const express = require("express");
const app = express();
var bodyParser=require('body-parser');
var sizeLimit=process.env.SIZE_LIMIT || '5mb';
app.use( bodyParser.json( { limit: sizeLimit } ) );
app.use( bodyParser.urlencoded( { limit: sizeLimit, extended: true } ) );

const axios = require("axios");
const {generate_nuban} = require("./cbn/nuban_algo");
const mongoose=require("mongoose");
require("./models/hippo")
require("./models/hippoMetrics");
var hippo = mongoose.model("hippo");
var hippoMetrics = mongoose.model("hippoMetrics");
if (process.env.NODE_ENV == 'production') var mongodbURL= 'mongodb+srv://hippo:hippo@cluster0.ztvy8.gcp.mongodb.net/hippopotamus?retryWrites=true&w=majority';
else if (process.env.NODE_ENV == 'development') var mongodbURL='mongodb://localhost:27017/hippopotamus';
else mongodbURL= 'mongodb+srv://hippo:hippo@cluster0.ztvy8.gcp.mongodb.net/hippopotamus?retryWrites=true&w=majority';
    
try {
    mongoose.connect(mongodbURL)
} catch (error) {
    console.log(error)
    throw error
}

app.use(express.static(__dirname+"/public"))
app.set('views',__dirname+"/views")
app.set('view engine', 'pug');
app.use((req, res, next)=> {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods","PUT,DELETE,POST,GET")
  next();
});

const lastMineUp = async () => {
    var hM = await hippoMetrics.find({});
    return hM[0].lastMineUp;
}
const lastMineDown = async () => {
    var hM = await hippoMetrics.find({});
    return hM[0].lastMineDown;
}
const mineAmount = async () => {
    var hM = await hippoMetrics.find({});
    return hM[0].mineAmount;
}

const setLastMineUp = async (d) => {
    var hM = await hippoMetrics.findOne({});
    hM.lastMineUp = d;
    hM.save();
}

const setLastMineDown = async (d) => {
    var hM = await hippoMetrics.findOne({});
    hM.lastMineDown = d;
    hM.save();
}

const setMineAmount = async () => {
    var hM = await hippoMetrics.findOne({});
    hM.mineAmount = Number(hM.mineAmount) + 1;
    hM.save();
}

app.get("/mine/:startAccount/:bankCode/:direction/:steps",async (req,res)=>{
    var {startAccount,bankCode,direction,steps} = req.params;
    for(var i=0;i<steps;i++){
        var serial_no;
        console.log(`${i}  ------------------------><`)
        direction == "up" ? serial_no = Number(startAccount) + i : serial_no = startAccount - i;
        var serial_no_length = serial_no.toString().length;
        if (serial_no_length < 9){
            var zeroAmount = 9 - serial_no_length;
            for (var o = 0 ; o < zeroAmount; o++){
                serial_no = "0" + serial_no;
            }
        }
        var gen = await generate_nuban(serial_no,bankCode);
        
        var hippoExist = await hippo.findOne({accountNumber:gen});
        if (hippoExist == null){
            var isHigh = Math.max(await lastMineUp()[`accountNumber`], gen) == gen;
            var isLow = Math.min(await lastMineDown()[`accountNumber`] , gen) == gen;
            try{
                var resp = await axios.get(`https://abp-mobilebank.accessbankplc.com/VBPAccess/webresources/nipNameInquiry2?destinationBankCode=${bankCode}&accountNumber=${gen}`);
                //console.log(`${resp.data}`);
            }
            catch(e){
                res.json({error:"error in connect"});
            }
            var data = resp.data;
            if (data.customerAccountName != null){
                    
                var pdata = {
                    bvn : data.beneficiaryBvn,
                    accountNumber : gen,
                    name : data.customerAccountName,
                    bankCode : bankCode,
                    dateMined : new Date(),
                    dump : data
                };
                var person = new hippo(pdata);
                
                if (isHigh) setLastMineUp(pdata);
                else if (isLow) setLastMineDown(pdata);
                else console.log("in-between");
                try{
                    await setMineAmount();
                    person.save();
                }
                catch(e){
                    res.json("error saving")
                }
            }
        }
        else console.log(`${gen} exists`);
    }
    res.json({success:"mining finished"});
})

app.get("/ping",async (req,res) => {
    res.json("ping received");
})
app.listen(process.env.PORT ? process.env.PORT : 9190 , (e) => {
    if (e) throw e;
    console.log("..mining in session");
})
