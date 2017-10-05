/**
 * Created by aarnavjindal on 06/10/17.
 */
$(function () {
   let list=$('#list');
   $.get('/scores',function (data) {
        for(let i=0;i<data.length;i++){
            console.log(data[i]);
            let item=$(`<li></li>`);
            item.append($(`<span class="col-4">TeamName: ${data[i].TeamName}</span>`));
            item.append($(`<span class="col-4">Score: ${data[i].score}</span>`));
            item.append($(`<span class="col-4">TimeLeft: ${data[i].timeLeft}</span>`));
            list.append(item);
        }
   })
});