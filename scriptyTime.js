/**
 * Created by witty on 22-07-2017.
 */

let txt="01:00";
let lbl;
let min=txt.substring(0,2);
let sec=txt.substring(3);
let min1=parseInt(min);
let sec1=parseInt(sec);
let myVar=setInterval(timer,1000);

let questions;
let answers;
let i=0;

$(function () {
    let lbl1=$("#l1");

    lbl=lbl1;
    lbl.text(txt);

    let next=$("#nxt");
    let btnIN=$("#btnIN");
    let Dbox=$("#Dbox");
    let whiteBG=$("#white-background");
    let output1=$("#output1");
    let right=$("#right");
    let wrong=$("#wrong");
    let guy=$("#guy");
    let score=$("#l3");
    let scoreVal0=score.text().substring(0,7);
    let scoreVal=score.text().substring(7);

    readQuesFile();
    readAnsFile();

    output1.text(questions[0]);

    btnIN.click(function () {
        let a=answers[i];
        let ans=document.getElementById("ans");
        if(i>=questions.length)
        {
            Dbox.hide();
        }else {
            if (ans.value.localeCompare(a) == 0) {
                Dbox.show();
                right.show();
                // guy.css("margin-top","260px");
                whiteBG.show();
                console.log("right");
                let sc=parseInt(scoreVal);
                sc=sc+2;
                scoreVal=sc.toString();
                score.text(scoreVal0+scoreVal);

            }
            else {
                Dbox.show();
                wrong.show();
                whiteBG.show();
                console.log("false");
                let sc=parseInt(scoreVal);
                sc=sc-1;
                scoreVal=sc.toString();
                score.text(scoreVal0+scoreVal);
            }
        }

        i=i+1;
    });
    next.click(function () {
        right.hide();
        wrong.hide();
        Dbox.hide();
        whiteBG.hide();
        output1.text(questions[i]);
        if(i>=questions.length)
        {
            output1.text("game over");
            clearInterval(myVar);
        }
    })

});

function readQuesFile() {
    let questions1=$.ajax({
        url: "ques",
        async: false
    }).responseText;
    questions=questions1.split(/\r?\n/)
    console.log(questions1);
};

function readAnsFile() {
    let answers1=$.ajax({
        url: "ans",
        async: false
    }).responseText;
    answers=answers1.split(/\r?\n/)
    console.log(answers1);
};



function timer() {

    if(sec1==0&&min1==0)
    {
        clearInterval(myVar);
        lbl.text("over");
    }else if(sec1==0&& min1!=0){
        sec1=59;
        min1=min1-1;
        min=min1.toString();
        sec=sec1.toString();
        if(min.length==1)
        {
            min="0"+min;
            lbl.text(min + ":" + sec);
        }else {
            lbl.text(min + ":" + sec);
        }
    }else if(sec1!=0){

        sec1=sec1-1;
        sec=sec1.toString();
        if(sec.length!=2)
        {lbl.text(min+":0"+sec);
        }
        else{
            lbl.text(min+":"+sec);
        }

    }

};
