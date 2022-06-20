var fs = require("fs");
const jsdom = require("jsdom");

fs.readFile("./files/err1.html", "utf-8", (err, data) => {
  if (err) {
    console.log(err);
  } else {
    const dom = new jsdom.JSDOM(data);
    const block = dom.window.document.getElementsByClassName("content");
    var c = 0;
    for (let index = 0; index < block.length - 1; index++) {
      const temp = new jsdom.JSDOM(block[index].outerHTML);

      const question = temp.window.document.getElementsByClassName("qtext");
      const answer = temp.window.document.getElementsByClassName("ablock");
      const rightanswer =
        temp.window.document.getElementsByClassName("rightanswer");

      if (question[0] && answer[0] && rightanswer[0]) {
        c++;
        console.log(
          "-----------------------------------------------------------------------------"
        );
        console.log(question[0].textContent);
        console.log(answer[0].textContent);
        console.log(rightanswer[0].textContent);
      }
    }
    console.log(c);
  }
});

setTimeout(() => {}, 111111);
