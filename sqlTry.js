const mysql = require('mysql');
const express=require('express');


const app=express();

var db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "chinu",
    database:"firstDB"
});

db.connect(function(err) {
    if (err) {throw err;}
    console.log("Connected!");
});

app.listen('3000',()=>{
    console.log("server started on port 3000")
})


//creating database
app.get('/createdb',(req,res)=>{
   let sql= 'CREATE DATABASE firstDB';
   db.query(sql,(err,result)=>{
       if(err) throw err;
       res.send("database created");
   })
});

//creating table
app.get("/table",(req,res)=>{
    let sql="CREATE TABLE players(id int AUTO_INCREMENT,name VARCHAR(255), PRIMARY KEY (id))"
    db.query(sql,(err,result)=>{
        if(err) throw  err;
        res.send('table created');
    })
})


//insert
app.get("/insert",(req,res)=>{
    let post  ={name:'shriya'};
    let sql='INSERT INTO players SET ? ';
   let query=db.query(sql,post,(err,result)=>{
       if(err) throw  err;
       res.send('post added');
   })

})
app.get("/insert1",(req,res)=>{
    let post  ={name:'chinaya'};
    let sql='INSERT INTO players SET ? ';
    let query=db.query(sql,post,(err,result)=>{
        if(err) throw  err;
        res.send('post2 added');
    })

})
app.get("/insert2",(req,res)=>{
    let post  ={name:"pp"};
    let sql='INSERT INTO players SET ? ';
    let query=db.query(sql,post,(err,result)=>{
        if(err) throw  err;
        res.send('posts added');
    })

})

//select
app.get("/getres1",(req,res)=>{

    let sql='SELECT * FROM players ';
    let query=db.query(sql,(err,result)=>{
        if(err) throw  err;
        console.log(result)
        res.send('data fetched');
    })

})
