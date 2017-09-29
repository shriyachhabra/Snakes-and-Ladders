$(function () {

    let newtodo = $('#newtodo')
    let addtodo = $('#addtodo')
    let todolist = $('#todolist')
    let pwd=$("#pwd");
    let cname=$("#cname");
    // function refreshTodos() {
    //     todolist.empty();
    //     $.get('/players',
    //         function (data) {
    //             for (todo1 of data) {
    //                 todolist.append($(`
    //       <li>
    //         <span>${todo1.name}</span>
    //         <span>pass = ${todo1.pw}</span>
    //       </li>`
    //                 ))
    //             }
    //         }
    //     )
    // }
    //
    // refreshTodos();

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