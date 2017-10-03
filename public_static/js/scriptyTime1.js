
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
    // btnIN.hide();


    let scoreVal0 = score.text().substring(0, 7); //Score :

    $.post('/detail',function (data) {
        pos = data.level;
        scoreVal = data.score;
        score.text(scoreVal0+scoreVal);
        time=data.timeLeft;
        i = data.mcq;
        if(pos===17||i>=questions.length()){
            endgame();
        }
        output1.text(questions[i]);
        btnIN.show();
        move(pos);
    });
    readQuesFile();
    readAnsFile();

    //to press the enter key to submit
    answ.keyup(function (event) {
        if (event.keyCode === 13) {
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

            if (val.localeCompare(a) === 0) {
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
                    move(pos);
                    Dbox.show();
                    right.show();
                    whiteBG.show();
                });
            }
            else {
                i++;
                console.log("false");

                let sc = parseInt(scoreVal);
                sc--;
                scoreVal = sc.toString();
                score.text(scoreVal0 + scoreVal);
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
            if(i>=questions.length) {
                endgame();
            }
            output1.text(questions[i]);
        }})
});

function readQuesFile() {
    let questions1=$.ajax({
        url: "Files/ques",
        async: false
    }).responseText;
    questions=questions1.split(/\r?\n/);
    console.log(questions1);
}

function readAnsFile() {
    let answers1=$.ajax({
        url: "Files/ans",
        async: false
    }).responseText;
    answers=answers1.split(/\r?\n/);
    console.log(answers1);
}

function timer() {
    time--;
    if(time===0)
        endgame();
    lbl.text(Math.floor(time/60)+":"+time%60);
}

function move(moveto) {
    let guy = $("#guy");
    // at 1
    let x=[150,240,330,420];
    let y=[20,100,180,260];
    switch (moveto){
        case 1:
            guy.css('margin-top',y[3]);
            guy.css('marginLeft',x[0]);
            break;
        case 2:
            guy.css('margin-top',y[3]);
            guy.css('marginLeft',x[1]);
            break;
        case 3:
            guy.css('margin-top',y[3]);
            guy.css('marginLeft',x[2]);
            break;
        case 4:
            guy.css('margin-top',y[3]);
            guy.css('marginLeft',x[3]);
            break;
        case 5:
            guy.css('margin-top',y[2]);
            guy.css('marginLeft',x[3]);
            break;
        case 6:
            guy.css('margin-top',y[2]);
            guy.css('marginLeft',x[2]);
            break;
        case 7:
            guy.css('margin-top',y[2]);
            guy.css('marginLeft',x[1]);
            break;
        case 8:
            guy.css('margin-top',y[2]);
            guy.css('marginLeft',x[0]);
            break;
        case 9:
            guy.css('margin-top',y[1]);
            guy.css('marginLeft',x[0]);
            break;
        case 10:
            guy.css('margin-top',y[1]);
            guy.css('marginLeft',x[1]);
            break;
        case 11:
            guy.css('margin-top',y[1]);
            guy.css('marginLeft',x[2]);
            break;
        case 12:
            guy.css('margin-top',y[1]);
            guy.css('marginLeft',x[3]);
            break;
        case 13:
            guy.css('margin-top',y[0]);
            guy.css('marginLeft',x[3]);
            break;
        case 14:
            guy.css('margin-top',y[0]);
            guy.css('marginLeft',x[2]);
            break;
        case 15:
            guy.css('margin-top',y[0]);
            guy.css('marginLeft',x[1]);
            break;
        case 16:
            guy.css('margin-top',y[0]);
            guy.css('marginLeft',x[0]);
            break;
    }
}

function endgame() {
    window.close();
    window.open('final.html');
}