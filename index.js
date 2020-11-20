const nuban = require("./cbn/nuban_algo");
const bank_codes = require("./cbn/digit_codes");

const express = require("express");
const app = express();
const dbMethods = require("./DatabaseControl");;

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
const request = require('request');
const {
    generate_nuban
} = require("./cbn/nuban_algo");

app.use(express.static(__dirname + "/public"))
app.set('views', __dirname + "/views")
app.set('view engine', 'pug');
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "PUT,DELETE,POST,GET")
    next();
});
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
                console.log("trying to ping")
            }
            catch(e){
                console.log(`Error pinging  \n`);
            }
        }
        else clearInterval();
    }, 300000);
}
const lastMineUpBank = async (code) => {
    return await dbMethods.mineUp(code);
}
const lastMineDownBank = async (code) => {
    return await dbMethods.mineDown(code);
}

app.get("/mine/:startAccount/:bankCode/:direction/:steps/:hippoLeg", async (req, res) => {
    var {
        startAccount,
        bankCode,
        direction,
        steps
    } = req.params;
    ping(200000,req.params.hippoLeg);
    console.log("should start")
    for (var i = 0; i < steps; i++) {
        var serial_no;
        direction == "up" ? serial_no = Number(startAccount) + i : serial_no = Number(startAccount) - i;
        var serial_no_length = serial_no.toString().length;
        if (serial_no_length < 9) {
            var zeroAmount = 9 - serial_no_length;
            for (var o = 0; o < zeroAmount; o++) {
                serial_no = "0" + serial_no;
            }
        }
        
        var gen = await generate_nuban(serial_no, bankCode);
        
        var hippoExist = await dbMethods.accountExists(gen,bankCode);
        
        if (!hippoExist) {
            try {
                var resp = await axios.get(`https://abp-mobilebank.accessbankplc.com/VBPAccess/webresources/nipNameInquiry2?destinationBankCode=${bankCode}&accountNumber=${gen}`);
                
            } catch (e) {
                console.log(e);
                console.log("error in connecting");
            }
            var data = resp.data;
            console.log(data.customerAccountName);
            if (data.customerAccountName != null) {
                var pdata = {
                    bvn: data.beneficiaryBvn,
                    accountNumber: gen,
                    name: data.customerAccountName,
                    bankCode: bankCode,
                    dateMined: new Date(),
                    timeMined : new Date().getTime(),
                    kycLevel : data.kycLevel
                };
                console.log(pdata.accountNumber)
                try {
                    dbMethods.insertAccount(bankCode,pdata);
                } catch (e) {
                    console.log(e)
                    console.log("error saving")
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
    "044" : "010396170",
    "058": "014886741"
}

var startAuto = async (x) => {
    chip(x); 
}
const chip = async (x) => {
    var serial_no;
    var {bankCode,direction,hippoLeg,startAccount} = x;
    for(var i = 0;i<10000;i++){
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
        //console.log(gen)
        var hippoExist = await dbMethods.accountExists(gen,bankCode);
        if (!hippoExist){
            try{
                var resp = await axios.get(`https://abp-mobilebank.accessbankplc.com/VBPAccess/webresources/nipNameInquiry2?destinationBankCode=${bankCode}&accountNumber=${gen}`);
                //console.log(`${resp.data}`);
            }
            catch(e){
                console.log(e.errno,e.code,e.code);
            }
            var data = resp.data;
            if (data.customerAccountName != null){
                var pdata = {
                    bvn : data.beneficiaryBvn,
                    accountNumber : gen,
                    name : data.customerAccountName,
                    bankCode : bankCode,
                    dateMined : new Date(),
                    timeMined : new Date().getTime(),
                    kycLevel : data.kycLevel
                };
                try{
                    dbMethods.insertAccount(bankCode,pdata);
                 
                }
                catch(e){
                    console.log(e);
                }
            }
        }
        else console.log(`${gen} exists`);
    }
    startAuto();
}
app.get("/autopilot/:timeFrame/:bankCode/:direction/:hippoLeg",async (req,res)=>{
    var {timeFrame,bankCode,direction,hippoLeg} = req.params;
    var startAccount;
    startAccount = (direction == 'up') ? (await lastMineUpBank(bankCode)).substring(0,9) : (await lastMineDownBank(bankCode)).substring(0,9);
    startAccount ? "" : startAccount = nubans[`${bankCode}`];
    console.log("started from :: " + startAccount);
    ping(timeFrame,hippoLeg);
    console.log("Auto pilot started");
    startAuto({
        bankCode : bankCode,
        direction : direction,
        hippoLeg : hippoLeg,
        startAccount : startAccount,

    })
    res.json({type : "success", msg : "Autopilot activated"});
})
app.get("/ping", async (req, res) => {
    res.json({type:"success",msg:"ping received"});
})

app.listen(process.env.PORT ? process.env.PORT : 9191, (e) => {
    if (e) throw e;
    console.log("..mining in session");
})

