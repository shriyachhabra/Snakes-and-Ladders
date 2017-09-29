/**
 * Created by championswimmer on 11/07/17.
 */
const express = require('express');
const bp = require('body-parser');
const db = require('./db')

const app = express();

app.use('/', express.static(__dirname + "/public_static"));

app.use(bp.urlencoded({extended: true}))
app.use(bp.json())

//Return list of all todos
app.get('/players', (req, res) => {
    db.getTodos().then(function (todos) {
        res.send(todos)
    }).catch(function (err) {
        res.send({error: "Could not retrieve todos"})
    })
})

//Add a new todo
app.post('/players', (req, res) => {
    db.addTodo(req.body.TeamName,req.body.pw).then(function () {
     //console.log(req.query.name);
     //console.log(req.query.pw);
        res.send({success: true})

    }).catch(function (err) {

    })
})

app.listen(7892, function () {
console.log("Server started on http://localhost:7892");
});