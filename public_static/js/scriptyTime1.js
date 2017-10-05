let working=false;
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
    let instr=$("#instr");
    let answ = $("#ans");
    btnIN.hide();



    let scoreVal0 = score.text().substring(0, 7); //Score :

    instr.click(function () {
        window.open('instr2.html');
    });

    $.post('/detail',function (data) {
        pos = data.level;
        scoreVal = data.score;
        score.text(scoreVal0+scoreVal);
        time=data.timeLeft;
        i = data.mcq;
        if(pos===17||i>=questions.length){
            endgame();
        }
        $('#TN').text(data.TeamName);
        output1.text(questions[i]);
        btnIN.show();
        move(pos);
    });
    readQuesFile();
    readAnsFile();
    //to press the enter key to submit
    answ.keyup(function (event) {
        if(event.keyCode===13)
            btnIN.click();
    });
    btnIN.click(function () {
        if(!working) {
            working=true;
            let j=i*4;
            let a1 = answers[j];
            let a2 = answers[j+1];
            let a3 = answers[j+2];
            let a4 = answers[j+3];

            if (i >= questions.length) {
                Dbox.hide();
            } else {
                i++;
                var val = answ.val();
                if (val.localeCompare(a1) == 0 || val.localeCompare(a2) == 0 || val.localeCompare(a3) == 0 || val.localeCompare(a4) == 0) {
                    console.log("right");
                    let sc = parseInt(scoreVal);
                    sc+=2;
                    scoreVal = sc.toString();
                    score.text(scoreVal0 + scoreVal);
                    pos++;

                    $.post('/update', {
                        lvl: pos,
                        scr: scoreVal,
                        g_time: time,
                        mcq: i
                    }, function (data) {
                        move(pos);
                        Dbox.show();
                        right.show();
                        whiteBG.show();
                    });
                }
                else {
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
                    }, function (data) {
                        Dbox.show();
                        wrong.show();
                        whiteBG.show();
                    });
                }
            }
        }
        answ.val("");
    });

    next.click(function () {
        working=false;

        right.hide();
        wrong.hide();
        Dbox.hide();
        whiteBG.hide();
        if(pos%4===0){
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
    questions=questions1.split("~~~");
}

function readAnsFile() {
    let answers1=$.ajax({
        url: "Files/ans",
        async: false
    }).responseText;
    answers=answers1.split(/\r?\n/);
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
            guy.css('marginLeft',x[3]);
            break;
        case 10:
            guy.css('margin-top',y[1]);
            guy.css('marginLeft',x[2]);
            break;
        case 11:
            guy.css('margin-top',y[1]);
            guy.css('marginLeft',x[1]);
            break;
        case 12:
            guy.css('margin-top',y[1]);
            guy.css('marginLeft',x[0]);
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