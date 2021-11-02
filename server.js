var express = require("express"); //Express Web Server
var busboy = require("connect-busboy"); //middleware for form/file upload
var path = require("path"); //used for file path
var fs = require("fs-extra"); //File System - for file manipulation
const shortid = require("shortid");

const mysql = require("mysql");
const jsdom = require("jsdom");

var app = express();
app.use(busboy());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const database = mysql.createPool({
  connectionLimit: 100,
  host: "localhost",
  user: "root",
  database: "answer",
  password: "root",
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


app.route("/upload").post(function (req, res, next) {
  var fstream;
  req.pipe(req.busboy);
  req.busboy.on("file", function (fieldname, file, filename) {
    var filename = shortid.generate() + ".html";
    console.log("Uploading: " + filename);

    //Path where image will be uploaded
    fstream = fs.createWriteStream(__dirname + "/files/" + filename);
    file.pipe(fstream);
    fstream.on("close", function () {
      console.log("Upload Finished of " + filename);
      FileToSQL(filename);
      res.redirect("back"); //where to go next
    });
  });
});

function FileToSQL(file_name) {
  fs.readFile("./files/" + file_name, "utf8", function (err, data) {
    if (err) {
      logger('File', `Помилка читання файлу ${file_name}`, err);
    } else {
      const dom = new jsdom.JSDOM(data);
      const jquery = require("jquery")(dom.window);
      const question = dom.window.document.querySelectorAll("div.qtext");
      const rightanswer =dom.window.document.getElementsByClassName("c1 text correct");
      const answer = "-";

      var valuse = [];
      var topic = "SP";
      var subtopic = "not stable";
      database.query(
        "select question, rightanswer from main",
        function (err, result) {
          if (err) {
            logger('DB Error', 'Помилка підключення до БД', err);
          } else {
            try {
                for (let i = 0; i < question.length; i++) {
                    duplicate = 0;
                    for (let j = 0; j < result.length; j++) {
                      if (
                        question[i].textContent == result[j].question &&
                        rightanswer[i].textContent == result[j].rightanswer
                      ) {
                        duplicate = 1;
                        break;
                      }
                    }
                    if (duplicate == 0) {
                      valuse.push([
                        topic,
                        subtopic,
                        question[i].textContent,
                        rightanswer[i].textContent,
                        answer,
                      ]);
                    }
                  }
            } catch (error) {
                console.log('errors')
            }
            
            if (valuse.length > 0) {
              const db_request =
                "INSERT main (topic, subtopic, question, rightanswer , answer) VALUES ?";
              database.query(db_request, [valuse], function (err) {
                if (err) {
                  console.log("Eror " + err);
                } else {
                  logger('Add' , "В базу додано " + valuse.length + " записів");
                }
              });
            }
          }
        }
      );
    }
  });
}

app.get("/upload", (req, res) => {
  res.sendfile("./html/upload.html");
});

app.get("/table", (req, res) => {
    database.query("SELECT * FROM main", (err, rows) => {
      res.render("testtable", { page_title: "Test Table", data: rows });
      logger('Request', 'Виконано запит до сайту-таблиці');
    });
  });


app.get("/", (req, res) => {
  res.sendfile("./html/menu/");
});
app.get("/style.css", function (req, res) {
  res.sendFile(__dirname + "/" + "html/menu/style.css");
});


var server = app.listen(3030, function () {
  console.log("Listening on port %d", server.address().port);
});
