$(function () {
    let newtodo = $('#newtodo');
    let addtodo = $('#addtodo');
    let pwd=$("#pwd");

    addtodo.click(function () {
        $.post('/players',
            {   TeamName: newtodo.val(),
                pw:pwd.val()
            },
            function (data,err) {
                if (data.success) {
                    console.log("yay");
                }
                else
                    throw err;
            }
        );
        window.open('/instructions.html');
        self.close();
    })
});