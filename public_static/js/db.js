/**
 * Created by championswimmer on 11/07/17.
 */
let name="";

const Sequelize = require('sequelize');

const db = new Sequelize({
    host: 'localhost',
    username: 'aarnavjindal',
    database: 'firstdatabase',
    password: '9350577773',
    dialect: 'mysql'
});


const Todos = db.define('players', {
    TeamName:{type: Sequelize.DataTypes.STRING,
    primaryKey:true

    },  //TASK
    pw:Sequelize.DataTypes.STRING,//password
    score:Sequelize.DataTypes.INTEGER,
    level:Sequelize.DataTypes.INTEGER,
    timeLeft:Sequelize.DataTypes.STRING,
    mcq:Sequelize.DataTypes.INTEGER
});

db.sync({alter: true}).then(function () {
    console.log("Database is ready");
});

function addTodo(Tname,pw) {
    console.log(Tname+"   "+pw);
    name=Tname;
    return Todos.create({
        TeamName: Tname,
        pw:pw,
        timeLeft:"60:00",
        score:0,
        level:1,
        mcq:0
    })
}

function getTodos () {
    return Todos.findAll()
}

module.exports = {
    addTodo, getTodos
};