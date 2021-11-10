var express = require("express");
const fs = require("fs");
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

const mysql = require("mysql");
require("dotenv").config();
const bcrypt = require('bcrypt');


var app = express();
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

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

app.get('/', (req, res) => {
	if (req.session.loggedin) {
		res.sendFile(__dirname + "/views/index.html");
	} else {
		res.sendFile(__dirname + "/login.html");
	}
});

app.get('/firstlogin', (req, res) => {
	
		res.sendFile(__dirname + "/firstlogin.html");
});

app.post('/first_login', (req, res) => {

  var username = req.body.username;
	var password = req.body.password;
  
	database.query('SELECT * FROM accounts WHERE username = ?', [username], (err, rows) => {
    if(rows.length > 0){
      if(rows[0].first_login){
        bcrypt.hash(password, 10, (err, hash) => {
           database.query(`UPDATE accounts SET first_login = 0 WHERE username = '${username}'`, (err) => {if(err)console.log(err)})
           database.query(`UPDATE accounts SET password = '${hash}' WHERE username = '${username}'`, (err) => {if(err)console.log(err)})
           res.redirect('/');
      });
      }else{
        res.send('Error!');
      }
    }else{
      res.send('User not found!');
    }
  }) 
});

app.post('/auth', (req, res) =>{


	var username = req.body.username;
	var printed_password = req.body.password;

	if (username && printed_password) {
		database.query('SELECT * FROM accounts WHERE username = ? ', [username], (error, results, fields) => {
      if (results.length > 0) {
      
      bcrypt.compare(printed_password, results[0].password, (err, result_hash) => {

			if (result_hash) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/');
			}else {
				res.send('Incorrect Username and/or Password!');
			}			
			res.end();
		});
  }else {
    res.send('Incorrect Username and/or Password!');
  }	
  }); 
	} else {
		res.send('Please enter Username and Password!');
		res.end();
	} 
});

app.get('/search', (req, res) => {
	if (req.session.loggedin) {
		res.sendFile(__dirname + "/views/search/index.html");
	} else {
    res.sendFile(__dirname + "/login.html");
	}
});

app.get('/table', (req, res) => {
	if (req.session.loggedin) {
		database.query("SELECT * FROM main", (err, rows) => {

      var splited_content = [];
      for (let i = 0; i < rows.length; i++) {
        var content =  rows[i].question.split('\n')
        splited_content.push(content)
       }
  
       res.render("table_output", { splited_content: splited_content, data: rows });
       logger('Request', 'Виконано запит до сайту-таблиці');
    });
	} else {
    res.sendFile(__dirname + "/login.html");
	}
});

app.get('/searchresult', (req, res) => {
	if (req.session.loggedin) {
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
	} else {
    res.sendFile(__dirname + "/login.html");
	}
});

var server = app.listen(process.env.PORT || 8080, () => {
  console.log("Listening on port %d", server.address().port);
});
