const mysql = require("mysql");
const config = require("./dbconfig")
const connection = mysql.createConnection(config)
const {codes} = require("./cbn/digit_codes");


const dbMethods = {
    setup : async () => {
        codes.forEach(bank => {
            let bankname = `bank${bank.code}`
            console.log(bankname)
            let createTable = `CREATE TABLE IF NOT EXISTS ${bankname}(
                id int primary key auto_increment,
                accountNumber char(11) NOT NULL,
                name varchar(255) NOT NULL,
                bvn char(12) NOT NULL,
                bankCode char(3) NOT NULL,
                dateMined DATE,
                timeMined TIME,
                kycLevel int(1),
                KEY (accountNumber,bankCode, bvn)
            )`
            connection.query(createTable, (err,results,fields) => {
                if(err) console.log(err.message)
                else console.log(fields)
            })
        })
    },
    query : async (query) => {
        connection.query(query);
    },
    insertAccount : async (bank,data) => {
        var {accountNumber,name,bvn,bankCode,dateMined,timeMined,kycLevel} = data;
       /* var ae = await dbMethods.accountExists(accountNumber,bank);*/
       /* if (!ae){*/
            let insertAcc = `INSERT INTO bank${bank}(accountNumber,name,bvn,bankCode,dateMined,timeMined,kycLevel)
                         VALUES('${accountNumber}','${name}','${bvn}','${bankCode}','${dateMined}','${timeMined}','${kycLevel}')`;
            return new Promise((resolve,reject) => {
                connection.query(insertAcc, (e,r,f) => {
                    if(e) reject(e.message);
                    else if (r) {
                      console.log(r);
                      resolve(r?r:f);
                    }
                    else resolve(r)
                })
            })
      /*  }*/
      /* else console.log("account Exists");*/
    },
    accountExists : async (acc,bank) => {
        var q = `SELECT * FROM bank${bank} WHERE accountNumber = '${acc}'`;
        return new Promise((resolve,reject) => {
            connection.query(q,(e,r,f)=>{
                if(e) reject(e.message);
                else if (r.length > 0){
                    resolve(true);
                }
                else resolve(false)
            });
        })
        console.log(quer)
        /**/
        
    },
    endConnection : async () => {
        connection.end()
    }
}
t = async () =>{
    var ae = await dbMethods.accountExists("0148867412","058");
    console.log(ae);
}
/*dbMethods.insertAccount("058",{
    accountNumber : "0103961700",
    name : "TIN CAN",
    bvn : "2213476576",
    bankCode : "058",
    dateMined : new Date(),
    timeMined : new Date().getTime(),
    kycLevel : "2"
});*/
//dbMethods.setup();
//dbMethods.accountExists("0103961700","058").then(d => console.log(d)).catch(e => console.log(e));

module.exports = dbMethods;
