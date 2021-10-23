require("dotenv").config();
const mysql = require("mysql");
const { Telegraf } = require("telegraf");
const schedule = require("node-schedule");
const fs = require('fs')
const moment = require('moment');

var time_now = moment().hour()+"."+ moment().minute()+"."+moment().second()+"   "+moment().date()+"/"+moment().month()+"/"+moment().weekYear();

var logtofile = fs.createWriteStream('log/last.txt', {
    flags: 'a' 
  })


const bot = new Telegraf(process.env.TG_TOKEN);

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
  });

  bot.command("getid", (ctx) => {
    ctx.reply(ctx.message.chat.id);
  });

  bot.command("gettime", (ctx) => {
    ctx.reply("Current time "+ moment().hour()+"."+ moment().minute()+"."+moment().second()+"   "+moment().date()+"/"+moment().month()+"/"+moment().weekYear());
  });

  bot.command("getlog", (ctx) => {
    bot.telegram.sendDocument(
        ctx.message.chat.id,
        { source: "./log/last.txt" },
        {disable_notification: true,
         caption: "Last log" }
      ).catch(err =>{
        if(err.message == '400: Bad Request: file must be non-empty'){
            ctx.reply("Log file is empty!"); 
        }
      })
  });

  bot.command("clearlog", (ctx) => {
    fs.truncate('log/last.txt', 0, function(){console.log(moment().hour()+"."+ moment().minute()+"."+moment().second()+"   "+moment().date()+"/"+moment().month()+"/"+moment().weekYear() + ' - Log cleaned'); ctx.reply(moment().hour()+"."+ moment().minute()+"."+moment().second()+"   "+moment().date()+"/"+moment().month()+"/"+moment().weekYear() + ' - Log cleaned')})
  });

  bot.command("stats", (ctx) => {
    db.query("SELECT id FROM main", function (err, main) {
      db.query("SELECT value FROM other", function (err, result) {
        ctx.reply("Банк питань - "+ main.length+"\n" + "Запитів за сьогодні - "+ result[1].value + "   📈" + "\n" + "Запитів за весь час - "+ result[0].value + " 📈");
      });
    });
  });




bot.on('text', (ctx) => {

    db.query("UPDATE other SET value = value + 1 WHERE id  = 1");
    db.query("UPDATE other SET value = value + 1 WHERE id  = 2");

    bot.telegram.getChat(ctx.message.chat.id).then(chat => {
        var log_content =  " Id - " + chat.id + "; Username - " + chat.username + "; Name - "+ chat.first_name+ "; Запит - "+ ctx.message.text+".\n";
        console.log(moment().hour()+"."+ moment().minute()+"."+moment().second()+"   "+moment().date()+"/"+moment().month()+"/"+moment().weekYear() + log_content)
        logtofile.write(moment().hour()+"."+ moment().minute()+"."+moment().second()+"   "+moment().date()+"/"+moment().month()+"/"+moment().weekYear() + log_content)
    })
    
    db.query("SELECT * FROM main WHERE question like '%" + ctx.message.text + "%'", function (err, results) {
        if (err){
            console.log("Eror " + err)
        }else{
            var res_message = "";
        for (let i = 0; i < results.length; i++) {
            res_message += "Питання № "+results[i].id +"\n_" + results[i].question + "_\n\n*" + results[i].rightanswer + "*\n\n" + results[i].answer.replace(":",":\n") + "\n\n";
        }

        if(results.length>0){
            var option = {
                "parse_mode": "markdown",
                disable_notification: true
              };
    
            bot.telegram.sendMessage(ctx.chat.id,`Результати пошуку : 🔍\n+ "${res_message}"'`, option).catch(err =>{  console.log(err)
                if(err.message == '400: Bad Request: message is too long'){
                    ctx.reply("Відповідь занадто велика! Спробуйте задати питання точніше!"); 
                  
                }
              });
        }else{
            bot.telegram.sendMessage(ctx.chat.id, "Нажаль нам не вдалось знайти відповідь на ваше запитання 😰", {disable_notification: true});
        }
        
      
                
                

        }
      });

})

var j = schedule.scheduleJob("0 0 0 * * *", function () {
    db.query("UPDATE other SET value=0 WHERE id=2");
  });

bot.launch()