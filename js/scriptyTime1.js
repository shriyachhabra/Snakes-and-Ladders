
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
    let answ=$("#ans");

    readQuesFile();
    readAnsFile();


    output1.text(questions[0]);

    //to press the enter key to submit
    answ.keyup(function(event){
        if(event.keyCode == 13){
            btnIN.click();
        }
    });

    btnIN.click(function () {
        let a=answers[i];
        let ans=document.getElementById("ans");
        if(i>=questions.length)
        {
            Dbox.hide();
        }else {
            var val=ans.value;

            if (val.localeCompare(a) == 0) {
                // guy.css('marginLeft',400);
                rightAnswer();


                Dbox.show();
                right.show();
                whiteBG.show();


                console.log("right");
                let sc=parseInt(scoreVal);
                sc=sc+2;
                scoreVal=sc.toString();
                score.text(scoreVal0+scoreVal);

            }
            else {
                wrongAnswer();
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

function rightAnswer()
{
    let guy=$("#guy");
    // at 1
    if(parseFloat(guy.css('margin-top'))=== 260 && parseFloat(guy.css('marginLeft'))===150)
    {
        guy.css('marginLeft',330); //at 3
    }
    // at 2
    else if (parseFloat(guy.css('margin-top'))=== 260 && parseFloat(guy.css('marginLeft')) === 240)
    {
        guy.css('marginLeft', 420);
    }
    // at 3
    else if (parseFloat(guy.css('margin-top'))=== 260 && parseFloat(guy.css('marginLeft')) === 330)
    {
        guy.css('marginLeft', 420);
        guy.css('margin-top', 180);
    }

    // at 4
    else if (parseFloat(guy.css('margin-top'))=== 260 && parseFloat(guy.css('marginLeft')) === 420)
    {
        guy.css('margin-top', 180 );
        guy.css('marginLeft', 330 );
    }

    // at 5
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 420)
    {
        guy.css('marginLeft', 240 );
    }

    // at 6
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 330)
    {
        guy.css('marginLeft', 150 );
    }

    // at 7
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 240)
    {
        guy.css('margin-top', 100 );
        guy.css('marginLeft', 150 );
    }

    // at 8
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 150)
    {
        guy.css('margin-top', 100 );
        guy.css('marginLeft', 240 );
    }

    // at 9
    else if (parseFloat(guy.css('margin-top'))=== 100 && parseFloat(guy.css('marginLeft')) === 150)
    {
        guy.css('marginLeft', 330 );
    }

    // at 10
    else if (parseFloat(guy.css('margin-top'))=== 100&& parseFloat(guy.css('marginLeft')) === 240)
    {
        guy.css('marginLeft', 420 );
    }

    // at 11
    else if (parseFloat(guy.css('margin-top'))=== 100 && parseFloat(guy.css('marginLeft')) === 330)
    {
        guy.css('margin-top', 20 );
        guy.css('marginLeft', 420 );
    }

    // at 12
    else if (parseFloat(guy.css('margin-top'))=== 100 && parseFloat(guy.css('marginLeft')) === 420)
    {
        guy.css('margin-top', 20 );
        guy.css('marginLeft', 330 );
    }

    // at 13
    else if (parseFloat(guy.css('margin-top'))=== 20 && parseFloat(guy.css('marginLeft')) === 420)
    {

        guy.css('marginLeft',240 );
    }

    // at 14
    else if  (parseFloat(guy.css('margin-top'))=== 20 && parseFloat(guy.css('marginLeft')) === 330)
    {

        guy.css('marginLeft', 150);
    }

    // at 15
    else if (parseFloat(guy.css('margin-top'))=== 20 && parseFloat(guy.css('marginLeft')) === 240)
    {

        guy.css('marginLeft', 150 );
    }



};

function wrongAnswer()
{
    let guy=$("#guy");
    // at 1
    if(parseFloat(guy.css('margin-top'))=== 260 && parseFloat(guy.css('marginLeft')) === 150)
    {

    }
    // at 2
    else if (parseFloat(guy.css('margin-top'))=== 260 &&  parseFloat(guy.css('marginLeft')) === 240)
    {
        guy.css('marginLeft', 150 );
    }
    // at 3
    else if (parseFloat(guy.css('margin-top'))=== 260 &&  parseFloat(guy.css('marginLeft')) === 330)
    {
        guy.css('marginLeft', 240 );

    }

    // at 4
    else if (parseFloat(guy.css('margin-top'))=== 260 && parseFloat(guy.css('marginLeft'))  === 420)
    {

        guy.css('marginLeft', 330 );
    }

    // at 5
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 420)
    {
        guy.css('margin-top', 260 );
        guy.css('marginLeft', 420 );
    }

    // at 6
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 330)
    {

        guy.css('marginLeft', 420 );
    }

    // at 7
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 240)
    {
        guy.css('marginLeft', 330 );
    }

    // at 8
    else if (parseFloat(guy.css('margin-top'))=== 180 && parseFloat(guy.css('marginLeft')) === 150)
    {

        guy.css('marginLeft', 240 );
    }

    // at 9
    else if (parseFloat(guy.css('margin-top'))=== 100 &&  parseFloat(guy.css('marginLeft')) === 150)
    {
        guy.css('margin-top', 180 );
        guy.css('marginLeft', 150 );
    }

    // at 10
    else if (parseFloat(guy.css('margin-top'))=== 100 &&  parseFloat(guy.css('marginLeft')) === 240)
    {

        guy.css('marginLeft', 150 );
    }

    // at 11
    else if (parseFloat(guy.css('margin-top'))=== 100 &&  parseFloat(guy.css('marginLeft')) === 330)
    {

        guy.css('marginLeft', 240 );
    }

    // at 12
    else if (parseFloat(guy.css('margin-top'))=== 100 &&  parseFloat(guy.css('marginLeft')) === 420)
    {

        guy.css('marginLeft', 330 );
    }

    // at 13
    else if (parseFloat(guy.css('margin-top'))=== 20 &&  parseFloat(guy.css('marginLeft')) === 420)
    {
        guy.css('margin-top', 100 );
        guy.css('marginLeft', 420 );
    }

    // at 14
    else if (parseFloat(guy.css('margin-top'))=== 20 &&  parseFloat(guy.css('marginLeft')) === 330)
    {

        guy.css('marginLeft', 420 );
    }

    // at 15
    else if (parseFloat(guy.css('margin-top'))=== 20 &&  parseFloat(guy.css('marginLeft')) === 240)
    {

        guy.css('marginLeft', 330 );
    }
}
