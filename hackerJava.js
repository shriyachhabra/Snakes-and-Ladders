const http = require('http');
const querystring = require('querystring');
var returnContent="hi";

//codeChecker();


//console.log("hi");
//while(returnContent==undefined){};

//content();

 var result1=function  codeChecker() {


    var jsonToSend = querystring.stringify({
        'request_format': 'json',
        'source': "print 5",
        'lang': 5,
        'wait': true,
        'callback_url': '',
        'api_key': "hackerrank|1519194-1545|25d6fbfd1d3a849eaf98463723fd7120a28f244c",
        'testcases': "[\"1\",\"2\"]"
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
            //console.log(JSON.parse(returnContent));
            //res.json(JSON.parse(returnContent));
            console.log(returnContent)
        });
    });

    HRrequest.on('error', function(e) {
        returnContent = "Error: " + e.message;
        //res.json(returnContent);
    });

    HRrequest.write(jsonToSend);

    HRrequest.end();
    return returnContent;
}
function content() {
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~");
    //console.log(returnContent);
    var s = JSON.parse(returnContent);
    console.log(s);
    var output1 = s.result.stdout;
    console.log(output1[0]);
    //var str="";
    //str=output1;
    //console.log(str);
    // for(i=0;i<output1.length;i++)
    // {
    //     console.log(output1[i]);
    // }


}
result1();
setTimeout(content,7000);

