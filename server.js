/**
 * Created by championswimmer on 11/07/17.
 */
const express = require('express');
const bp = require('body-parser');
const db = require('./public_static/js/db');
const path=require('path');

const app = express();

app.use('/', express.static(path.join(__dirname,"public_static")));

app.use(bp.urlencoded({extended: true}));
app.use(bp.json());

//Return list of all players
app.get('/players', (req, res) => {
    db.getTodos().then(function (todos) {
        res.send(todos)
    }).catch(function (err) {
        res.send({error: "Could not retrieve todos"})
    })
});

//Add a new player
app.post('/players', (req, res) => {
    console.log(req);
    db.addTodo(req.body.TeamName,req.body.pw).then(function () {
        res.send({success: true})
    }).catch(function (err) {
        throw err;
    })
});

app.listen(8000, function () {
console.log("Server started on http://localhost:8000");
});