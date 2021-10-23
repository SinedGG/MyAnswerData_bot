require("dotenv").config();
const mysql = require("mysql");
const { Telegraf } = require("telegraf");
const schedule = require("node-schedule");
const fs = require("fs");
const bot = new Telegraf(process.env.TG_TOKEN);

const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

function logger(type, text) {
  var moment = require("moment-timezone");

  var log_text = `[${moment()
    .tz("Europe/Kiev")
    .format("YYYY-MM-DD HH:mm:ss")}] [${type}] - ${text}`;
  var logtofile = fs.createWriteStream("log/last.txt", {
    flags: "a",
  });

  console.log(log_text);

  logtofile.write(log_text + "\r\n");
}

bot.command("getid", (ctx) => {
  ctx.reply(ctx.message.chat.id);
});

bot.command("getlog", (ctx) => {
  bot.telegram
    .sendDocument(
      ctx.message.chat.id,
      { source: "./log/last.txt" },
      { disable_notification: true, caption: "Last log" }
    )
    .catch((err) => {
      if (err.message == "400: Bad Request: file must be non-empty") {
        ctx.reply("Log file is empty!");
      }
    });
});

bot.command("stats", (ctx) => {
  db.query("SELECT id FROM main", function (err, main) {
    db.query("SELECT value FROM other", function (err, result) {
      ctx.reply(
        "Банк питань - " +
          main.length +
          "\n" +
          "Запитів за сьогодні - " +
          result[1].value +
          "   📈" +
          "\n" +
          "Запитів за весь час - " +
          result[0].value +
          " 📈"
      );
    });
  });
});

bot.on("text", (ctx) => {
  db.query("UPDATE other SET value = value + 1 WHERE id  = 1");
  db.query("UPDATE other SET value = value + 1 WHERE id  = 2");

  logger('Request', `Id - ${ctx.chat.id} Username - ${ctx.chat.username} Запит - ${ctx.message.text}` )

  db.query(
    `SELECT * FROM main WHERE question like '%${ctx.message.text}%'`,
    function (err, results) {
      if (err) {
        console.log("Eror " + err);
      } else {
        var res_message = "";
        for (let i = 0; i < results.length; i++) {
          res_message += `Питання: \n<i>${results[i].question} </i> \n\nВідповідь: \n<b>${results[i].rightanswer.replace(";", "\n")} </b> \n\n`
        }

        if (results.length > 0) {
          var options = {
            parse_mode: "HTML",
            disable_notification: true,
          };

          bot.telegram
            .sendMessage(
              ctx.chat.id,
              `Результати пошуку : 🔍\n${res_message}`,
              options
            )
            .catch((err) => {
              //console.log(err);
              if (err.message == "400: Bad Request: message is too long") {
                ctx.reply(
                  "Відповідь занадто велика! Спробуйте задати питання точніше!"
                );
              }
              
              if (
                err.message.includes("400: Bad Request: can't parse entities")
              ) {
                ctx.reply(`Результати пошуку : 🔍\n${res_message}`);
              }
              
            });
        } else {
          bot.telegram.sendMessage(
            ctx.chat.id,
            "Нажаль нам не вдалось знайти відповідь на ваше запитання 😰",
            { disable_notification: true }
          );
        }
      }
    }
  );
});

var j = schedule.scheduleJob("0 0 0 * * *", function () {
  db.query("UPDATE other SET value=0 WHERE id=2");
});

bot.launch();
