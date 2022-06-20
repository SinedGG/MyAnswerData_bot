var express = require("express");
var path = require("path");
var fs = require("fs");
const shortid = require("shortid");

const fileUpload = require("express-fileupload");

const mysql = require("mysql");
const jsdom = require("jsdom");
require("dotenv").config();

var app = express();
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(
  fileUpload({
    createParentPath: true,
  })
);

const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

app.post("/upload", async (req, res) => {
  try {
    if (!req.files) {
      res.send({
        status: false,
        message: "No file uploaded",
      });
    } else {
      var filename = shortid.generate() + ".html";
      var file = req.files.fileUploaded;
      file.mv("./files/" + filename);
      setTimeout(() => {
        FileToSQL(res, filename);
      }, 2500);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

function FileToSQL(res, file_name) {
  fs.readFile("./files/" + file_name, "utf8", function (err, data) {
    if (err) {
      console.log(err);
    } else {
      db.query("select question, rightanswer from main", (err, result) => {
        if (err) {
          console.log(err);
        } else {
          var valuse = [];
          var topic = "exam";
          var subtopic = "IPZ";
          var question;
          const dom = new jsdom.JSDOM(data);
          const block = dom.window.document.getElementsByClassName("content");
          for (let index = 0; index < block.length - 1; index++) {
            var duplicate = 0;
            const temp = new jsdom.JSDOM(block[index].outerHTML);

            question = temp.window.document.getElementsByClassName("qtext");
            const answer =
              temp.window.document.getElementsByClassName("ablock");
            const rightanswer =
              temp.window.document.getElementsByClassName("rightanswer");

            if (question[0] && rightanswer[0]) {
              for (let i = 0; i < result.length; i++) {
                if (
                  question[0].textContent == result[i].question &&
                  rightanswer[0].textContent == result[i].rightanswer
                ) {
                  duplicate = 1;
                  break;
                }
              }
              if (duplicate == 0) {
                valuse.push([
                  topic,
                  subtopic,
                  question[0].textContent,
                  rightanswer[0].textContent,
                  answer[0].textContent,
                ]);
              }
            }
          }
          if (valuse.length > 0) {
            const db_request =
              "INSERT main (topic, subtopic, question, rightanswer , answer) VALUES ?";
            db.query(db_request, [valuse], (err) => {
              if (err) {
                console.log(err);
              }
            });
          }
          var out_data = [
            block.length - 1,
            block.length - 1 - valuse.length,
            valuse.length,
          ];
          res.render("result", {
            page_title: "Test Table",
            data: out_data,
          });
        }
      });
    }
  });
}

app.get("/upload", (req, res) => {
  res.sendfile("./html/upload.html");
});

app.get("/table", (req, res) => {
  db.query("SELECT * FROM main", (err, rows) => {
    res.render("testtable", { page_title: "Test Table", data: rows });
    logger("Request", "Виконано запит до сайту-таблиці");
  });
});

app.get("/result", (req, res) => {
  res.render("result", { page_title: "Test Table", data: "test" });
});

app.get("/", (req, res) => {
  res.sendfile("./html/menu/");
});
app.get("/style.css", function (req, res) {
  res.sendFile(__dirname + "/" + "html/menu/style.css");
});

var server = app.listen(process.env.PORT || 8080, function () {
  console.log("Listening on port %d", server.address().port);
});
