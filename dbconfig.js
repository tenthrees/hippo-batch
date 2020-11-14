var tE = 'production';

var dbHost = "";
if (tE != "production"){
    if (process.env.NODE_ENV == 'production') dbHost = 'database-2.colv5hu21fvb.us-east-2.rds.amazonaws.com';
    else if (process.env.NODE_ENV == 'development') dbHost ='localhost';
    else dbHost = 'database-2.colv5hu21fvb.us-east-2.rds.amazonaws.com';
}
else dbHost = 'database-2.colv5hu21fvb.us-east-2.rds.amazonaws.com';
console.log(`DBHost is ${dbHost}`);

const config = {
    host: dbHost,
    user: 'admin',
    password: 'hippo75#',
    database: 'hippo',
    port: '3306'
}

module.exports = config;