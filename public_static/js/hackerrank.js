const http = require('http');
const querystring = require('querystring');
let inputs=[];
let ind=0;
let imcq;
let ans=[
    ["1 3","1 3 5"]
];
let ques_inp=[
    ["2","3"]
];

let max_scr=0;

$(function () {
    let time;
    let lbl = $("#time");
    let myVar = setInterval(timer, 1000);
    //for the purpose of showing
    let score = $("#score");
    let submit = $("#submit");
    let moveon = $("#moveon");
    let test = $('#test');
    let next = $("#nxt");
    let Dbox = $("#Dbox");
    let whiteBG = $("#white-background");
    let rightans = $("#right");
    let guy = $("#guy");
    let input = $("#input");
    let report = $('#report');
    let loader = $("#loader");

    disabler();

    $.post('/detail',function (data,success) {
        score.text(data.score);
        time=data.timeLeft;
        ind=data.level;
        imcq=data.mcq;
        enabler();
    });

    var code = $("#text")[0];
    var editor = CodeMirror.fromTextArea(code, {
        mode: "clike",
        theme: "eclipse",
        tabSize: 0,
        lineNumbers: true,
        extraKeys: {"Ctrl-Space": "autocomplete"}
    });

    var langCode = 3;
    let language = $("#language");

    var Cpp = "#include<iostream>\n#include<cmath>\n#include<cstdio>\n#include<vector>\n#include<algorithm>\nusing namespace std;\n\nint main(){\n  \n/*Write your code*/\n\nreturn 0;\n}";

    var C = "#include <math.h>\n" +
        "#include <stdio.h>\n" +
        "#include <string.h>\n" +
        "#include <stdlib.h>\n\n" +
        "int main(){\n/*Write your code*/\n\nreturn 0;\n}";


    var Java = "import java.io.*;\n" +
        "import java.util.*;\n" +
        "import java.text.*;\n" +
        "import java.math.*;\n" +
        "import java.util.regex.*;\n\n" + "public class Solution {\n" + "  public static void main(String[] args) {\n" +
        "    Scanner scn = new Scanner(System.in);\n     //Write your code\n    }\n" +
        "}";
    var Python = "#Write your code here";

    var JS = "function processData(input){\n//Enter your code here\n}\nprocess.stdin.resume();\n" +
        "\n" +
        "process.stdin.setEncoding('ascii');\nvar input_stdin = \"\";\nprocess.stdin.on('data', function (data) {\n" +
        "\n" +
        "    input_stdin += data;\n" +
        "\n" +
        "});\nprocess.stdin.on('end', function () {\n" +
        "\n" +
        "  processData(input_stdin);" +
        "\n" +
        "});\n"

    editor.setValue(Java);
    language.on('change', function () {
        langCode = $(this).val();
        console.log(langCode);
        if (langCode == 1) {
            editor.setValue(C);
        } else if (langCode == 2) {
            editor.setValue(Cpp);
        } else if (langCode == 3) {
            editor.setValue(Java);
        } else if (langCode == 5) {
            editor.setValue(Python);
        } else if (langCode == 20) {
            editor.setValue(JS);

        }


    });

    var response = $("#response");
    var returnContent = "";
    var codeVal;
    var one = $("#one");

    test.click(function () {
        disabler();
        codeVal = editor.getValue();
        inputs.push(input.val());
        inputs=JSON.stringify(inputs);
        console.log(inputs);
        result1();
        setTimeout(content, 5000);
        inputs=[];
        enabler();
    });

    submit.click(function () {
        disabler();
        codeVal=editor.getValue();
        inputs=JSON.stringify(ques_inp[(ind/4)-1]);
        console.log(inputs);
        result1();
        console.log(returnContent);
        codearray=JSON.parse(returnContent).result.stdout;
        console.log(codearray);
        let count=0;
        for(let t=0;t<ans[(ind/4)-1].length;t++){
            if(ans[(ind/4)-1][t]===codearray[t].trim())
            count++;
        }
        max_scr=Math.floor((count*4)/codearray.length);
        report.text(count+" out of "+codearray.length+" testcases passed");
        inputs=[];
        enabler();
    });
    var result1 = function codeChecker() {

        var jsonToSend = querystring.stringify({
            'request_format': 'json',
            'source': codeVal,
            'lang': langCode,
            'wait': true,
            'callback_url': '',
            'api_key': "hackerrank|1519194-1545|25d6fbfd1d3a849eaf98463723fd7120a28f244c",
            'testcases': inputs
        });


        var HRoptions = {
            hostname: 'api.hackerrank.com',
            path: '/checker/submission.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(jsonToSend)
            }
        };
        var HRrequest = http.request(HRoptions, function (HRresponse) {
            HRresponse.setEncoding('utf8');
            HRresponse.on('data', function (data) {
                enabler();
                try {
                    returnContent = data;
                } catch (e) {
                    returnContent = "Error: " + e;
                }
            });
        });

        HRrequest.on('error', function (e) {
            enabler();
            returnContent = "Error: " + e.message;
        });

        HRrequest.write(jsonToSend);

        HRrequest.end();
    };

// //for showing
//     submit.click(function () {
//         whiteBG.show();
//         Dbox.show();
//         rightans.show();
//         score.text(2);
//         setTimeout(function () {
//             guy.css('marginLeft', 350);
//         }, 2000);
//
//     })
    //for showing
    next.click(function () {
        whiteBG.hide();
        Dbox.hide();
        rightans.hide();
    })

    function content() {
        var s = JSON.parse(returnContent);
        console.log(s);
        var output1 = s.result.stdout;

        response.text(output1[0]);
        loader.hide();
    }

    function timer() {
        time--;
        lbl.text(Math.floor(time/60)+":"+time%60);
    };

    moveon.click(function () {
        $.post('/update', {
            lvl: ind+1,
            scr: parseInt(score.text())+max_scr,
            g_time: time,
            mcq: imcq
        },function (data) {
            window.open("quesPage.html");
        })
    })

    function disabler() {
        loader.show();
        moveon.attr("disabled",true);
        test.attr("disabled",true);
        submit.attr("disabled",true);
    }

    function enabler() {
        loader.hide();
        moveon.attr("disabled",false);
        test.attr("disabled",false);
        submit.attr("disabled",false);
    }
});

















