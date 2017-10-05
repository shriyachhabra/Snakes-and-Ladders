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


const Todos = db.define('Players', {
    TeamName:{type: Sequelize.DataTypes.STRING,
    primaryKey:true
    },  //TASK
    score:Sequelize.DataTypes.INTEGER,
    level:Sequelize.DataTypes.INTEGER,
    timeLeft:Sequelize.DataTypes.INTEGER,
    mcq:Sequelize.DataTypes.INTEGER,
    name1:Sequelize.DataTypes.STRING,
    name2:Sequelize.DataTypes.STRING,
    college:Sequelize.DataTypes.STRING,
    email:Sequelize.DataTypes.STRING,
    tel:Sequelize.DataTypes.STRING
});

db.sync({alter: true}).then(function () {
    console.log("Database is ready");
});

// function exists() {
//     Todos.count({where:{TeamName:name}})
//         .then(count => {
//             if(count != 0) {
//                 return true;
//             }
//             return false;
//         });
// }

function addTodo(data) {
        name=data.TeamName;
            return Todos.create({
                TeamName: data.TeamName,
                name1: data.Name1,
                name2: data.Name2,
                college: data.CollegeName,
                email: data.Email,
                tel: data.Phone,
                timeLeft: 3600,
                score: 0,
                level: 1,
                mcq: 0
            })
}

function getTodo () {
    return Todos.findOne({
        where:{
            TeamName:name
        }
    })
}

function update(body) {
    Todos.update({
        mcq:body.mcq,
        score:body.scr,
        level:body.lvl,
        timeLeft:body.g_time

    },{where:{TeamName:name}})
        .then(function (data) {
            console.log(data);
        }).catch(function (err) {
        throw err;
    })
}

function results() {
    return Todos.findAll();
}

module.exports = {
    addTodo, getTodo , update ,results
};