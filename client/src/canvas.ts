interface Pos {
    x: number;
    y: number;
};

export class DrawingCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    /* rendering state */
    private lastframe: number = 0;

    /* drawing state */
    private drawing: boolean = false;
    private lastpos: Pos = {x: 0, y: 0};
    private curpos: Pos = {x: 0, y: 0};

    constructor(element: HTMLCanvasElement) {
        const ctx = element.getContext('2d');
        if (ctx == null) {
            throw "Fuck off";
        }

        this.canvas = element;
        this.ctx = ctx;

        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.initEventHandlers();
    }

    private initEventHandlers() {
        this.canvas.addEventListener('mousedown', e => {
            this.drawing = true;
            this.lastpos.x = e.x;
            this.lastpos.y = e.y;
        });
        this.canvas.addEventListener('mouseup', e => {
            this.drawing = false;
        });
        this.canvas.addEventListener('mousemove', e => {
            this.curpos.x = e.x;
            this.curpos.y = e.y;
        });
        this.canvas.addEventListener('touchstart', e => {
            this.drawing = true;
            const touch = e.touches[0];

            this.lastpos.x = touch.clientX;
            this.lastpos.y = touch.clientY;
        });
        this.canvas.addEventListener('touchend', e => {
            this.drawing = false;
        });
        this.canvas.addEventListener('touchmove', e => {
            const touch = e.touches[0];

            this.curpos.x = touch.clientX;
            this.curpos.y = touch.clientY;
        });
    }

    render(timestamp: number) {
        let delta = timestamp - this.lastframe;
        this.lastframe = timestamp;

        console.log(delta);
        if (this.drawing) {
            this.ctx.moveTo(this.lastpos.x, this.lastpos.y);
            this.ctx.lineTo(this.curpos.x, this.curpos.y);
            this.ctx.stroke();
            this.lastpos.x = this.curpos.x;
            this.lastpos.y = this.curpos.y;
        }
    }

    drawStroke(base: [number, number], deltas: Array<[number, number]>, color: string) {
        this.ctx.strokeStyle = color;
        this.ctx.moveTo(base[0], base[1]);
        const lastpoint = base;
        for (const delta of deltas) {
            lastpoint[0] += delta[0];
            lastpoint[1] += delta[1];
            this.ctx.lineTo(lastpoint[0], lastpoint[1]);
        }
        this.ctx.stroke();
    }
};