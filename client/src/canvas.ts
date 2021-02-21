import axios from 'axios'

interface Pos {
    x: number;
    y: number;
};

interface Stroke {
    points: Array<[number, number]>;
    color: string;
    width: number;
};

export class DrawingCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    strokeHandler?: (s: Stroke) => void;

    /* rendering state */
    private history: Array<Stroke> = [];
    private current?: Stroke;
    private lastframe: number = 0;
    private users: Array<String> = [];
    private lineWidth: number = 2;

    /* drawing state */
    private color: string = "#" + ((1<<24)*Math.random() | 0).toString(16);
    private drawing: boolean = false;
    private lastpos: Pos = { x: 0, y: 0 };
    private curpos: Pos = { x: 0, y: 0 };

    /* time stamp */
    private minTime: number = 0;
    private maxTime: number = 0;
    private curTime: number = 0;

    constructor(element: HTMLCanvasElement, private setcolor: HTMLInputElement, private setwidth: HTMLInputElement, private url: string, private fpscounter?: HTMLDivElement | null, private userlist?: HTMLDivElement | null) {
        const ctx = element.getContext('2d');
        if (ctx == null) {
            throw "Fuck off";
        }

        this.canvas = element;
        this.ctx = ctx;

        console.log(this.color);
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.lineWidth;
        this.getHistory();
        this.setcolor.setAttribute("value", this.color);
        this.setwidth.setAttribute("value", this.lineWidth.toString());
        this.initEventHandlers();
    }

    private drawHistoryStroke() {
        for (const stroke of this.history) {

            this.drawStroke(stroke.points, stroke.color, stroke.width, false);
        }
    }
    
    public resize(w: number, h: number) {
        this.ctx.canvas.width = w;
        this.ctx.canvas.height = h;
        this.drawHistoryStroke();
        this.ctx.lineWidth = this.lineWidth;
    }

    private async getHistory() {
        await axios.get(`https://${this.url}:46970/strokes`).then(async res => {
            for (const entries of res.data) {
                this.history.push(entries);
                this.minTime = Math.min(this.minTime, entries.timestamp);
                this.maxTime = Math.max(this.maxTime, entries.timestamp);
            }
            this.resize(this.canvas.width, this.canvas.height);
        }).catch(e => {
            throw "Error getting history stroke from server";
        })
    };

    public async getUsers() {
        await axios.get(`https://${this.url}:46970/users`).then(async res => {
            this.users = res.data;
        }).catch(e => {
            throw "Error getting user lists";
        })
        if (this.userlist) {
            let temp: string = "Client List:";
            for (const user of this.users) {
                temp = temp + "<br>" + user[0];
            }
            this.userlist.innerHTML = temp;
        }
    };

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
        this.setcolor.addEventListener('input', e => {
            this.color = this.setcolor.value;
        });
        this.setwidth.addEventListener('input', e => {
            this.lineWidth = this.setwidth.valueAsNumber;
            this.ctx.lineWidth = this.lineWidth;
        });
        this.setwidth.addEventListener('input', e => {
            this.lineWidth = this.setwidth.valueAsNumber;
            this.ctx.lineWidth = this.lineWidth;
        });
    }

    render(timestamp: number) {
        let delta = timestamp - this.lastframe;
        this.lastframe = timestamp;

        let fps = (1000 / delta).toFixed(2);
        if (this.fpscounter) {
            this.fpscounter.textContent = `FPS: ${fps}`;
        }

        if (this.drawing) {
            this.ctx.strokeStyle = this.color;
            this.ctx.beginPath();
            this.ctx.lineWidth = parseFloat(this.setwidth.value);
            this.ctx.lineCap = "round";
            this.ctx.moveTo(this.lastpos.x, this.lastpos.y);
            this.ctx.lineTo(this.curpos.x, this.curpos.y);
            this.ctx.stroke();
            this.lastpos.x = this.curpos.x;
            this.lastpos.y = this.curpos.y;
        }
    }

    drawStroke(points: Array<[number, number]>, color: string, width: number, save: boolean = true) {
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.lineWidth = width;
        this.ctx.lineCap = "round";
        this.ctx.moveTo(points[0][0], points[0][1]);
        for (const point of points) {
            this.ctx.lineTo(point[0], point[1]);
        }
        this.ctx.stroke();

        if (save) {
            this.history.push({
                points,
                color,
                width,
            });
        }
    }

    private startStroke(x: number, y: number) {
        this.drawing = true;
        this.lastpos.x = x;
        this.lastpos.y = y;
        this.curpos = { ...this.lastpos };

        this.current = {
            points: [[x, y]],
            color: this.color,
            width: parseFloat(this.setwidth.value),
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