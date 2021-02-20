
    const canvas = document.getElementById('thecanvas');
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    ctx.moveTo(0, 0);
    ctx.lineTo(10, 10);
    ctx.stroke();

    let drawing = false;
    const lastpos = {x: 0, y: 0};
    const curpos = {x: 0, y: 0};

    canvas.addEventListener('mousedown', e => {
        drawing = true;
        lastpos.x = e.x;
        lastpos.y = e.y;
    });
    canvas.addEventListener('mouseup', e => {
        drawing = false;
    });
    canvas.addEventListener('mousemove', e => {
        curpos.x = e.x;
        curpos.y = e.y;
    });
    canvas.addEventListener('touchstart', e => {
        drawing = true;
        const touch = e.touches[0];
        // console.log(e.touches.length);
        // console.log(touch);

        lastpos.x = touch.clientX;
        lastpos.y = touch.clientY;
    });
    canvas.addEventListener('touchend', e => {
        drawing = false;
    });
    canvas.addEventListener('touchmove', e => {
        const touch = e.touches[0];
        // console.log(e.touches.length);
        // console.log(touch);

        curpos.x = touch.clientX;
        curpos.y = touch.clientY;
    });

    let lastframe = 0;
    function renderFrame(timestamp) {
        window.requestAnimationFrame(renderFrame);
        delta = timestamp - lastframe;
        timestamp = lastframe;

        console.log(drawing);
        if (drawing) {
            ctx.moveTo(lastpos.x, lastpos.y);
            ctx.lineTo(curpos.x, curpos.y);
            ctx.stroke();
            lastpos.x = curpos.x;
            lastpos.y = curpos.y;
        }
    }

    window.requestAnimationFrame(renderFrame);

window.ontouchend = (e) => {
    e.preventDefault();
};