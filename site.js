var express = require("express");
var busboy = require("connect-busboy");
var path = require("path");
const fs = require("fs");

const mysql = require("mysql");
require("dotenv").config();

var app = express();
app.use(busboy());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const database = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

function logger(type, text, err) {
    var moment = require("moment-timezone");
    var log_text = `[${moment()
      .tz("Europe/Kiev")
      .format("YYYY-MM-DD HH:mm:ss")}] [${type}] - ${text}`;
    var logtofile = fs.createWriteStream("log/last.txt", {
      flags: "a",
    });
  
    if (err == undefined) {
      err = "";
    }
    console.log(`${log_text} ${err}`);
  
    logtofile.write(`${log_text}  \r\n`);
  }



app.get("/", (req, res) => {
    database.query("SELECT * FROM main", (err, rows) => {

      var splited_content = [];
      for (let i = 0; i < rows.length; i++) {
        var content =  rows[i].question.split('\n')
        splited_content.push(content)
       }

      res.render("testtable", { splited_content: splited_content, data: rows });
      logger('Request', 'Виконано запит до сайту-таблиці');
    });
});


var server = app.listen(process.env.PORT || 8080, function () {
  console.log("Listening on port %d", server.address().port);
});
