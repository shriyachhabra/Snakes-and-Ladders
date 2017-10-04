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

let input_ques=[
    "Naagaland has its own currency. They have N types of coins C1 to Cn. The problems with Naagaland is that they are poor in maths and thus their currency system is not that perfect. The serpent can use any number of coins of each value. If the serpent cannot express an amount with any set of coins, then it's called a boogie value.The serpent wants to know what is the minimum boogie value.If there are no such boogie value then print -1.\n" +
    "Input Format: First line has an integer T, denoting the number of test cases.\n" +
    "1st line of each testcase contains an single integer N denoting the number of different type of coins.\n" +
    "2nd line of each testcase has $N$ integers C1,..., CN, denoting the different currency values.\n" +
    "Output Format:\n" +
    "Print N lines, each line having answer for respective testcase.\n" +
    "Constraints:\n" +
    "1 ≤ T ≤ 100\n" +
    "1 ≤ N ≤ 10^4\n" +
    "1 ≤ Ci ≤ 10^5\n" +
    "Sample Input:\n" +
    "1\n" +
    "5\n" +
    "1 2 3 4 5\n" +
    "Sample Output: -1",
    "We know that average of first N naturals number is the sum of first N natural numbers divided by N. Similarly Paverage of first N natural numbers is" +
    "the product of first N natural numbers divided by N. Naagina wants to know that for a given integer N, is the Paverage of first N natural numbers modulo" +
    "N is equal to N - 1 or not. Help Naagina solve the problem.\n" +
    "Input Format:\n" +
    "First line contains an integer T, denoting the number of testcases\n" +
    "Each test case consists of a single integer N.\n" +
    "Output Format:\n" +
    "For each testcase output either YES or NO\n" +
    "Constraints:\n" +
    "1 ≤ T ≤ 10^5\n" +
    "1 ≤ N ≤ 10^6\n" +
    "Sample Input:\n" +
    "2\n" +
    "2\n" +
    "4\n" +
    "Sample Output:\n" +
    "YES\n" +
    "NO\n",
    "Linda loves strings, especially strings that are palindromic. Snakiya on the other hand loves odd numbers, so both of them decided to combine their" +
    "respective love for palindromic strings and odd numbers to create a question for the Clash Final.\n" +
    "For a given integer N, find the Nth smallest odd " +
    "length palindrome consisting of lowercase english alphabets.\n" +
    "1) A string of length L(odd) comes before a string of length L+2\n." +
    "2) N'th palindromes are " +
    "sorted lexicographically.\n" +
    "Having made the question, both of them realised they couldnt formulate a solution to solve it.\n" +
    "Help them out by printing the" +
    "N'th smallest odd length palindrome pertaining to the given conditions.\n" +
    "Input format:\n" +
    "First line contains the number of test cases, T.\n" +
    "Each test case contains a single integer, N.\n" +
    "Output format:\n" +
    "Print the N'th smallest odd length palindrome pertaining to the given conditions.\n" +
    "Constraints\n" +
    "Subtask 1: (20 points)\n" +
    "1<=T<=1000\n" +
    "1<=N<=702\n" +
    "Subtask\n" +
    "2: (80 points)\n" +
    "1<=T<=10000\n" +
    "1<=N<=10^12\n" +
    "Sample:\n" +
    "Input:\n" +
    "3\n" +
    "1\n" +
    "26\n" +
    "27\n" +
    "702\n" +
    "703\n" +
    "Output:\n" +
    "a\n" +
    "z\n" +
    "aaa\n" +
    "zzz\n" +
    "aaaaa\n",
    "Naagina lives in Naagaland which consists of N cities(numbered from 1 to N) that are connected by M bidirectional roads. The roads are designed" +
    "such that there is atmost only one road between any two city, although there may be more than one path between them. Each road had it's own cost Ci.\n" +
    "It is also known that there is atleast one path between any two city, i.e., Naagaland is completely connected. There is a war about to happen between" +
    "the cities. Damage when two cities fight is described as follows:\n" +
    "When city A and B are at war the damage cost is the minimum sum of cost of roads which if destroyed the city will no longer remain connected.\n" +
    "Naagina must estimate the product of damage over all unordered pair of cities. Help Naagina to solve the problem.\n" +
    "Since the answer can be very large print the answer modulo 10^9 + 7.\n" +
    "Input Format:\n" +
    "First line ocontains two integers N and M, separated by a single space.\n" +
    "M lines follow. Each of these lines consist of three integers Xi, Yi, Ci denoting that road between the city Xi and the city Yi has cost Ci.\n" +
    "Output Format:\n" +
    "Print a single line consiting of an integer which denotes the answer.\n" +
    "Constraints:\n" +
    "3 ≤ N ≤ 500\n" +
    "3 ≤ M ≤ 10^4\n" +
    "1 ≤ Ci ≤ 10^5\n" +
    "Sample Input:\n" +
    "3 3\n" +
    "1 2 3\n" +
    "2 3 1\n" +
    "1 3 2\n" +
    "Sample Output:\n" +
    "36\n" +
    "Explanation:\n" +
    "Three unordered pairs: (1, 2), (1, 3) and (2, 3).\n" +
    "For 1 and 2 we have to remove the first and the second roads. Damage is 4.\n" +
    "For 1 and 3 we have to remove the second and the third roads. Damage is 3.\n" +
    "For 2 and 3 we have to remove the second and the third roads. Damage is 3.\n" +
    "Answer is 4x3x3 = 36.\n"
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
    let wholeQues = $('#wholeQues');
    let instruc=$('#instruc');
    disabler();


    $.post('/detail',function (data,success) {
        score.text(data.score);
        time=data.timeLeft;
        ind=data.level;
        wholeQues.text(input_ques[(ind/4)-1]);
        imcq=data.mcq;
        enabler();
    });


    instruc.click(function () {
        window.open('Instructions.html');
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
        if(time===0)
            endgame();
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

    function endgame() {
        window.close();
        window.open('final.html');
    }
});
















