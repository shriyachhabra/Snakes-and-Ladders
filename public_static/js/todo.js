$(function () {
    let teamname=$('#teamname');
    let n1=$('#name1');
    let n2=$('#name2');
    let clg=$('#college');
    let email=$('#email');
    let phone=$('#mobile');
    let addtodo=$('#addtodo');

    addtodo.click(function () {
        console.log("here");
        if(teamname.val()===""||n1.val()===""||n2.val()===""||clg.val()===""||email.val()===""||phone.val()===""){
            console.log("here1");
        }
        else
        {
            console.log("here2");
            $.post('/players',
                {
                    TeamName: teamname.val(),
                    Name1: n1.val(),
                    Name2: n2.val(),
                    CollegeName: clg.val(),
                    Email: email.val(),
                    Phone: phone.val()
                },
                function (data, err) {
                    if (data.success) {
                        console.log("yay");
                    }
                    else
                        throw err;
                }
            );
            window.open('/instructions.html');
            self.close();
        }
    })
});