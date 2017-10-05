/**
 * Created by aarnavjindal on 03/10/17.
 */
$(function () {
    $.post('/detail',(data)=>{
        let time=data.timeLeft;
        let score=data.score;
        $('#finalScore').text(score);
        $('#finalTime').text(time);
    })
});