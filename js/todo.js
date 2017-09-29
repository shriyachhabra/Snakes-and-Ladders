$(function () {

    let newtodo = $('#newtodo')
    let addtodo = $('#addtodo')
    let todolist = $('#todolist')
    let pwd=$("#pwd");
    let cname=$("#cname");

    addtodo.click(function () {

        localStorage.setItem("name",req.body.TeamName);
        console.log(localStorage.getItem("name"));

        console.log(newtodo.val()+" "+pwd.val())
        $.post('/players',
            {   TeamName: newtodo.val(),
                CollegeName:cname.val(),
                pw:pwd.val()
            },
            function (data) {
                if (data.success) {
                    //refreshTodos();
                    console.log("yay")
                }
            }
        )

    })



})