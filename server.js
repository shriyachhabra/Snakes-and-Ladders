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
app.post('/detail', (req, res) => {
    db.getTodo().then(function (todos) {
        res.send(todos)
    }).catch(function (err) {
        res.send({error: "Could not retrieve todos"})
    })
});
app.get('/demo',(req,res)=>{
  db.update({
      mcq:11,
      scr:29,
      lvl:17,
      g_time:927
  });
  res.send({success:true})
});
//Add a new player
app.post('/players', (req, res) => {
    db.addTodo(req.body).then(function () {
        res.send({success: true})
    }).catch(function (err) {
        throw err;
    })
});

app.post('/update',(req,res)=>{
    db.update(req.body);
    res.send({success:true})
});

app.get('/scores',(req,res)=>{
    db.results().then(function (todos) {
        todos.sort(function (a,b) {
            if(!(a.score===b.score))
            return b.score-a.score;

            return b.timeLeft-a.timeLeft;
        });
        res.send(todos);
    }).catch(function (err) {
        res.send({error:"Could not retrieve todos"})
    });
});

app.listen(4000, function () {
console.log("Server started on http://localhost:4000");
});
