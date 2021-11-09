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
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/search", (req, res) => {
  res.sendFile(__dirname + "/views/search/index.html");
});


app.get("/table", (req, res) => {
  database.query("SELECT * FROM main", (err, rows) => {

    var splited_content = [];
    for (let i = 0; i < rows.length; i++) {
      var content =  rows[i].question.split('\n')
      splited_content.push(content)
     }

     res.render("table_output", { splited_content: splited_content, data: rows });
     logger('Request', 'Виконано запит до сайту-таблиці');
  });
});

app.get("/searchresult", (req, res) => {
  var content = req.query;
  var search = content.search;
  database.query(`SELECT * FROM main`, (err, raw_content) => {
    if (err) {
      logger('DB Error', 'Помилка запиту до БД', err);
    } else {
      var seed = [];
      for (let i = 0; i < raw_content.length; i++) {
        var string = raw_content[i].question;
        string = string.replace(/(\r\n|\n|\r)/gm, " ");
        if (string.includes(search)) {
          seed.push([raw_content[i].question, raw_content[i].rightanswer]);
        }
      }
      var splited_content = [];
      for (let i = 0; i < seed.length; i++) {
        var content = seed[i][0].split("\n");
        splited_content.push(content);
      }
      var push_data = [];
      for (let i = 0; i < seed.length; i++) {
        push_data.push(seed[i][1])
      }
      logger('Request', `Виконано пошук: результатів - ${splited_content.length}. Питаання ${search}`);
      res.render("displayresult", { splited_content: splited_content, data: push_data });
    }
  });
});

var server = app.listen(process.env.PORT || 8080, () => {
  console.log("Listening on port %d", server.address().port);
});
