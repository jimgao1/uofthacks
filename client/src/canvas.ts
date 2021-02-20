interface Pos {
    x: number;
    y: number;
};

interface Stroke {
    points: Array<[number, number]>;
    color: string;
};

export class DrawingCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    strokeHandler?: (s: Stroke) => void;

    /* rendering state */
    private history: Array<Stroke> = [];
    private current?: Stroke;
    private lastframe: number = 0;

    /* drawing state */
    private drawing: boolean = false;
    private lastpos: Pos = { x: 0, y: 0 };
    private curpos: Pos = { x: 0, y: 0 };

    constructor(element: HTMLCanvasElement, private fpscounter?: HTMLDivElement | null) {
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
    
    public resize(w:number, h:number) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        let temp = this.ctx.getImageData(0, 0, W, H);
        this.ctx.canvas.width = w;
        this.ctx.canvas.height = h;
        this.ctx.putImageData(temp, 0, 0);
    }

    private initEventHandlers() {
        this.canvas.addEventListener('mousedown', e => {
            console.log('start stroke');
            this.startStroke(e.x, e.y);
        });
        this.canvas.addEventListener('mouseup', _ => {
            console.log('end stroke');
            this.endStroke();
        });
        this.canvas.addEventListener('mousemove', e => {
            this.updateStroke(e.x, e.y);
        });
        this.canvas.addEventListener('touchstart', e => {
            const touch = e.touches[0];
            this.startStroke(touch.clientX, touch.clientY);
        });
        this.canvas.addEventListener('touchend', _ => {
            this.endStroke();
        });
        this.canvas.addEventListener('touchmove', e => {
            const touch = e.touches[0];
            this.updateStroke(touch.clientX, touch.clientY);
        });
    }

    render(timestamp: number) {
        let delta = timestamp - this.lastframe;
        this.lastframe = timestamp;

        const fps = 1000 / delta;
        if (this.fpscounter) {
            this.fpscounter.textContent = `FPS: ${fps}`;
        }

        if (this.drawing) {
            console.log('here', this.lastpos.x, this.lastpos.y, this.curpos.x, this.curpos.y);
            this.ctx.moveTo(this.lastpos.x, this.lastpos.y);
            this.ctx.lineTo(this.curpos.x, this.curpos.y);
            this.ctx.stroke();
            this.lastpos.x = this.curpos.x;
            this.lastpos.y = this.curpos.y;
        }
    }

    drawStroke(points: Array<[number, number]>, color: string) {
        this.ctx.strokeStyle = color;
        this.ctx.moveTo(points[0][0], points[0][1]);
        for (const point of points) {
            this.ctx.lineTo(point[0], point[1]);
        }
        this.ctx.stroke();

        this.history.push({
            points,
            color,
        });
    }

    private startStroke(x: number, y: number) {
        this.drawing = true;
        this.lastpos.x = x;
        this.lastpos.y = y;

        this.current = {
            points: [[x, y]],
            color: this.ctx.strokeStyle.toString(),
        };
    }

    private updateStroke(x: number, y: number) {
        if (!this.drawing) {
            return;
        }
        if (this.current) {
            this.current.points.push([x, y]);
        }

        this.curpos.x = x;
        this.curpos.y = y;
    }

    private endStroke() {
        this.drawing = false;

        if (this.current) {
            if (this.strokeHandler) {
                this.strokeHandler(this.current);
            }

            this.history.push(this.current);
            this.current = undefined;
        }
    }
};