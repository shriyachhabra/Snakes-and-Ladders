 const http = require('http');
 const querystring = require('querystring');

$(function () {
    let txt="60:00";
    let lbl=$("#time");
    let min=txt.substring(0,2);
    let sec=txt.substring(3);
    let min1=parseInt(min);
    let sec1=parseInt(sec);
    let myVar=setInterval(timer,1000);
    //for the purpose of showing
    let score=$("#score");
    let submit=$("#submit1");

    let next=$("#nxt");
    let Dbox=$("#Dbox");
    let whiteBG=$("#white-background");
    let rightans=$("#right");
    let guy=$("#guy");
    let input=$("#input");

    var inp;
    var code=$("#text")[0];
    var editor=CodeMirror.fromTextArea(code,{
         mode:"clike",
        theme:"eclipse",
        tabSize:0,
        lineNumbers:true,
        extraKeys:{"Ctrl-Space":"autocomplete"}
    });

    var loader=$("#loader");
    loader.hide();


    var langCode=3;
    let language=$("#language");

    var Cpp="#include<iostream>\n#include<cmath>\n#include<cstdio>\n#include<vector>\n#include<algorithm>\nusing namespace std;\n\nint main(){\n  \n/*Write your code*/\n\nreturn 0;\n}";

    var C="#include <math.h>\n" +
        "#include <stdio.h>\n" +
        "#include <string.h>\n" +
        "#include <stdlib.h>\n\n"+
    "int main(){\n/*Write your code*/\n\nreturn 0;\n}";


    var Java="import java.io.*;\n" +
        "import java.util.*;\n" +
        "import java.text.*;\n" +
        "import java.math.*;\n" +
        "import java.util.regex.*;\n\n"+"public class Solution {\n"+"  public static void main(String[] args) {\n"+
        "    Scanner scn = new Scanner(System.in);\n     //Write your code\n    }\n" +
        "}";
    var Python="#Write your code here";

    var JS="function processData(input){\n//Enter your code here\n}\nprocess.stdin.resume();\n" +
        "\n" +
        "process.stdin.setEncoding('ascii');\nvar input_stdin = \"\";\nprocess.stdin.on('data', function (data) {\n" +
        "\n" +
        "    input_stdin += data;\n" +
        "\n" +
        "});\nprocess.stdin.on('end', function () {\n" +
        "\n" +
        "  processData(input_stdin);"+
        "\n" +
        "});\n"

       editor.setValue(Java);
        language.on('change',function () {
        langCode=$(this).val();
        console.log(langCode);
        if (langCode==1)
        {
            editor.setValue(C);
        }else if(langCode==2)
        {
            editor.setValue(Cpp);
        }else if(langCode==3)
        {
            editor.setValue(Java);
        }else if(langCode==5)
        {
            editor.setValue(Python);
        }else if(langCode==20)
        {
            editor.setValue(JS);

        }


    });

    var send=$("#send");
    var response=$("#response");
    var returnContent="";
    var codeVal;
    var one=$("#one");
    send.click(function () {
        loader.show();
        codeVal=editor.getValue();
        inp=input.val();
        result1();
        setTimeout(content,5000);
        console.log(returnContent);
    })
    var result1=function  codeChecker() {


        var jsonToSend = querystring.stringify({
            'request_format': 'json',
            'source': codeVal,
            'lang': langCode,
            'wait': true,
            'callback_url': '',
            'api_key': "hackerrank|1519194-1545|25d6fbfd1d3a849eaf98463723fd7120a28f244c",
            'testcases': "["+"\""+inp+"\""+"]"
        });

        console.log("==============================================================");
        console.log("Submission:");

        var HRoptions = {
            hostname: 'api.hackerrank.com',
            path: '/checker/submission.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(jsonToSend)
            }
        };
        var HRrequest = http.request(HRoptions, function(HRresponse) {
            HRresponse.setEncoding('utf8');
            HRresponse.on('data', function (data) {
                try {
                    returnContent = data;
                } catch (e) {
                    returnContent = "Error: " + e;
                }
            }).on('end', function () {
                console.log("==============================================================");
                console.log("Response:");
                res.json(JSON.parse(returnContent));
            });
        });

        HRrequest.on('error', function(e) {
            returnContent = "Error: " + e.message;
            res.json(returnContent);
        });

        HRrequest.write(jsonToSend);

        HRrequest.end();
        return returnContent;
    }

//for showing
    submit.click(function () {

        whiteBG.show();
        Dbox.show();
        rightans.show();
        score.text(2);
        setTimeout(function () {
            guy.css('marginLeft',350);
        },2000);

    })
    //for showing
    next.click(function () {
        whiteBG.hide();
        Dbox.hide();
        rightans.hide();
    })

    function content() {
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~");
        console.log(returnContent);

        var str="";
        // str=output1;
        var s = JSON.parse(returnContent);
        console.log(s);
        var output1 = s.result.stdout;

        response.text(output1);
        loader.hide();
        console.log(output1);
        console.log(str);

    }

    function timer() {

        if(sec1==0&&min1==0)
        {
            clearInterval(myVar);
            lbl.text("00:00");
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

 })

















