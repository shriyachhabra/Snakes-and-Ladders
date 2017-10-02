
let lbl;
let time;
let myVar=setInterval(timer,1000);

let questions;
let answers;
let i=0;

let scoreVal;
let pos;


$(function () {
    lbl = $("#lbl");
    let next = $("#nxt");
    let btnIN = $("#btnIN");
    let Dbox = $("#Dbox");
    let whiteBG = $("#white-background");
    let output1 = $("#output1");
    let right = $("#right");
    let wrong = $("#wrong");
    let guy = $("#guy");
    let score = $("#l3");
    let answ = $("#ans");
    btnIN.hide();


    let scoreVal0 = score.text().substring(0, 7); //Score :

    $.post('/detail',function (data) {
        pos = data.level;
        scoreVal = data.score;
        score.text(scoreVal0+scoreVal);
        time=data.timeLeft;
        i = data.mcq;
        output1.text(questions[i]);
        btnIN.show();
    });
    readQuesFile();
    readAnsFile();

    //to press the enter key to submit
    answ.keyup(function (event) {
        if (event.keyCode == 13) {
            btnIN.click();
        }
    });

    btnIN.click(function () {
        let a = answers[i];
        let ans = document.getElementById("ans");
        if (i >= questions.length) {
            Dbox.hide();
        } else {
            var val = ans.value;

            if (val.localeCompare(a) == 0) {
                //TODO: MOVEMENT OF MAN
                i++;
                console.log("right");
                let sc = parseInt(scoreVal);
                sc++;
                scoreVal = sc.toString();
                score.text(scoreVal0 + scoreVal);
                pos++;

                $.post('/update', {
                    lvl: pos,
                    scr: scoreVal,
                    g_time: time,
                    mcq: i
                },function (data) {
                    Dbox.show();
                    right.show();
                    whiteBG.show();
                });
            }
            else {
                //TODO: wrong answer work
                Dbox.show();
                wrong.show();
                whiteBG.show();

                console.log("false");
                let sc = parseInt(scoreVal);
                sc = sc - 1;
                scoreVal = sc.toString();
                score.text(scoreVal0 + scoreVal);
            }
        }
    });

    next.click(function () {
        right.hide();
        wrong.hide();
        Dbox.hide();
        whiteBG.hide();
        if(i%3===0){
        window.close();
        window.open('hackerrank.html');
            }
            else{
            output1.text(questions[i]);
            if(i>=questions.length)
            {
                output1.text("game over");
                clearInterval(myVar);
            }
        }})
})

function readQuesFile() {
    let questions1=$.ajax({
        url: "Files/ques",
        async: false
    }).responseText;
    questions=questions1.split(/\r?\n/)
    console.log(questions1);
};

function readAnsFile() {
    let answers1=$.ajax({
        url: "Files/ans",
        async: false
    }).responseText;
    answers=answers1.split(/\r?\n/)
    console.log(answers1);
};

function timer() {
    time--;
    lbl.text(Math.floor(time/60)+":"+time%60);
}

function rightAnswer() {
    let guy = $("#guy");
    // at 1
    if (parseFloat(guy.css('margin-top')) === 260 && parseFloat(guy.css('marginLeft')) === 150) {
        guy.css('marginLeft', 330); //at 3
    }
    // at 2
    else if (parseFloat(guy.css('margin-top')) === 260 && parseFloat(guy.css('marginLeft')) === 240) {
        guy.css('marginLeft', 420);
    }
    // at 3
    else if (parseFloat(guy.css('margin-top')) === 260 && parseFloat(guy.css('marginLeft')) === 330) {
        guy.css('marginLeft', 420);
        guy.css('margin-top', 180);
    }

    // at 4
    else if (parseFloat(guy.css('margin-top')) === 260 && parseFloat(guy.css('marginLeft')) === 420) {
        guy.css('margin-top', 180);
        guy.css('marginLeft', 330);
    }

    // at 5
    else if (parseFloat(guy.css('margin-top')) === 180 && parseFloat(guy.css('marginLeft')) === 420) {
        guy.css('marginLeft', 240);
    }

    // at 6
    else if (parseFloat(guy.css('margin-top')) === 180 && parseFloat(guy.css('marginLeft')) === 330) {
        guy.css('marginLeft', 150);
    }

    // at 7
    else if (parseFloat(guy.css('margin-top')) === 180 && parseFloat(guy.css('marginLeft')) === 240) {
        guy.css('margin-top', 100);
        guy.css('marginLeft', 150);
    }

    // at 8
    else if (parseFloat(guy.css('margin-top')) === 180 && parseFloat(guy.css('marginLeft')) === 150) {
        guy.css('margin-top', 100);
        guy.css('marginLeft', 240);
    }

    // at 9
    else if (parseFloat(guy.css('margin-top')) === 100 && parseFloat(guy.css('marginLeft')) === 150) {
        guy.css('marginLeft', 330);
    }

    // at 10
    else if (parseFloat(guy.css('margin-top')) === 100 && parseFloat(guy.css('marginLeft')) === 240) {
        guy.css('marginLeft', 420);
    }

    // at 11
    else if (parseFloat(guy.css('margin-top')) === 100 && parseFloat(guy.css('marginLeft')) === 330) {
        guy.css('margin-top', 20);
        guy.css('marginLeft', 420);
    }

    // at 12
    else if (parseFloat(guy.css('margin-top')) === 100 && parseFloat(guy.css('marginLeft')) === 420) {
        guy.css('margin-top', 20);
        guy.css('marginLeft', 330);
    }

    // at 13
    else if (parseFloat(guy.css('margin-top')) === 20 && parseFloat(guy.css('marginLeft')) === 420) {

        guy.css('marginLeft', 240);
    }

    // at 14
    else if (parseFloat(guy.css('margin-top')) === 20 && parseFloat(guy.css('marginLeft')) === 330) {

        guy.css('marginLeft', 150);
    }

    // at 15
    else if (parseFloat(guy.css('margin-top')) === 20 && parseFloat(guy.css('marginLeft')) === 240) {

        guy.css('marginLeft', 150);
    }
}