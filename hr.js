// Require HackerRank API and FS
var fs = require("fs");
var HackerRank = require("machinepack-hackerrank");

module.exports.defaultChecker = function(a, b) {
    return a.replace(/(\r\n|\n|\r)/gm, '').replace(/\s/g, '') == b.replace(/(\r\n|\n|\r)/gm, '').replace(/\s/g, '')
}

// var caseNum =1;
// var code="puts 'testing'"
// var language=5;
// var testcases="[\"\"]";
// var answers="";

// Submit a string of code
module.exports.evaluateCode = function (caseNum, code, language, testcases, answers, checker, callback) {
    var results = [];
    var casen = caseNum;
    HackerRank.submit({
        apiKey: "hackerrank|1532697-1790|a654eb1549062a974b5b071169039f58b1bbbc4d",
        source: code,
        language: language,
        testcases: testcases,
        wait: true,
        format: "json"
    }).exec({
        // Unexpected error
        error: function (err) {
            //throw err;
        },
        // Code compiled successfully
        success: function (response) {
            response = JSON.parse(response).result;
            if (response.compilemessage) {
                results.push(response.compilemessage);
                callback({ results: results });
            } else {
                response.stderr.forEach(function (val, index, array) {
                    if (val === false) {
                        if (checker(response.stdout[index], answers[index])) {
                            results.push(true);
                        } else {
                            results.push(false);
                        }
                    } else {
                        results.push(val);
                    }
                });
                // callback({
                //     results: results,
                //     message: response.message,
                //     time: response.time,
                //     casen: casen
                // });
            }
        }
    });
};