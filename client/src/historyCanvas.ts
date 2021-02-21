import axios from 'axios'

interface Pos {
    x: number;
    y: number;
};

interface TimeStroke {
    points: Array<[number, number]>;
    timestamp: number;
    color: string;
};

interface Stroke {
    points: Array<[number, number]>;
    color: string;
};

interface Transcript{
    identifier: string;
    timestamp: number;
    transcript: string;
};

interface HTMLInputEvent extends Event {
    target: HTMLInputElement & EventTarget;
}


export class DrawingCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    strokeHandler?: (s: Stroke) => void;

    /* rendering state */
    private historyStrokes: Array<TimeStroke> = [];
    private historyTranscripts: Array<Transcript> = [];
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
    private minTime: number = Number.MAX_VALUE;
    private offSet: number = 50;
    private timeInt: number = 1000;
    private maxTime: number = 0;
    private curPerc: number = 1000;
    private curTime: number = 0;

    constructor(element: HTMLCanvasElement, private setcolor: HTMLInputElement, private setwidth: HTMLInputElement, private settime: HTMLInputElement, private trans: HTMLDivElement, private fpscounter?: HTMLDivElement | null, private userlist?: HTMLDivElement | null) {
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
        this.ctx.canvas.width = this.ctx.canvas.width;
        this.calcRealTime();
        // console.log(this.minTime);
        // console.log(this.maxTime);
        // console.log(this.curPerc);
        // console.log(this.curPerc);
        for (const stroke of this.historyStrokes) {
            if (stroke.timestamp > this.curTime) continue;
            this.drawStroke(stroke.points, stroke.color, false);
        }
    }

    private drawHistoryTranscript() {
        this.calcRealTime();
        if (this.trans) {
            let temp = "";
            this.historyTranscripts.sort((a,b) => (a.timestamp > b.timestamp) ? 1 : ((b.timestamp > a.timestamp) ? -1 : 0));
            for (const trans of this.historyTranscripts) {
                temp = temp + "<p class='transcription' id ='" + trans.timestamp + "'>" + trans.identifier + " : " + trans.transcript + "<\p>";
            }
            this.trans.innerHTML = temp;
        }
    }
    
    public resize(w: number, h: number) {
        this.ctx.canvas.width = w;
        this.ctx.canvas.height = h;
        this.drawHistoryStroke();
        this.drawHistoryTranscript();
        this.ctx.lineWidth = this.lineWidth;
    }

    private calcRealTime() {
        let diff: number = this.maxTime - this.minTime;
        let perc: number = this.curPerc / this.timeInt;
        if (perc == 0) {
            this.curTime = this.minTime - this.offSet;
        } else if (perc == this.timeInt) {
            this.curTime = this.maxTime + this.offSet;
        } else {
            this.curTime = this.minTime + diff * perc;
        }
    }

    private async getHistory() {
        await axios.get('http://192.168.1.124:6970/strokes').then(async res => {
            for (const entries of res.data) {
                this.historyStrokes.push(entries);
                this.minTime = Math.min(this.minTime, entries.timestamp);
                this.maxTime = Math.max(this.maxTime, entries.timestamp);
            }
            console.log("blin done");
            this.resize(this.canvas.width, this.canvas.height);
        }).catch(e => {
            throw "Error getting history stroke from server";
        })
        await axios.get('http://192.168.1.124:6970/transcriptions').then(async res => {
            for (const entries of res.data) {
                this.historyTranscripts.push(entries);
                this.minTime = Math.min(this.minTime, entries.timestamp);
                this.maxTime = Math.max(this.maxTime, entries.timestamp);
            }
            console.log("blin2 done");
            this.resize(this.canvas.width, this.canvas.height);
        }).catch(e => {
            throw "Error getting history transcripts from server";
        })
    };

    public async getUsers() {
        await axios.get('http://192.168.1.124:6970/users').then(async res => {
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
        this.settime.addEventListener('input', e => {
            this.curPerc = this.settime.valueAsNumber;
            this.calcRealTime();
            this.drawHistoryStroke();
        });
        this.trans.addEventListener('click', e => {
            if (e.target) {
                const target = e.target as Element;
                if (target.className == "transcription") {
                    let temp: number = parseInt(target.id, 10);
                    let diff: number = this.maxTime - this.minTime;
                    let diff2: number = temp - this.minTime;
                    this.curPerc = diff2 / diff;
                    console.log(this.curPerc);
                    this.resize(this.ctx.canvas.width, this.ctx.canvas.height);
                    this.settime.setAttribute("value", (this.curPerc * this.offSet).toString());
                    console.log(target.id);
                }
            }
        })
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
            this.ctx.lineCap = "round";
            this.ctx.moveTo(this.lastpos.x, this.lastpos.y);
            this.ctx.lineTo(this.curpos.x, this.curpos.y);
            this.ctx.stroke();
            this.lastpos.x = this.curpos.x;
            this.lastpos.y = this.curpos.y;
        }
    }

    drawStroke(points: Array<[number, number]>, color: string, save: boolean = true) {
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.lineCap = "round";
        this.ctx.moveTo(points[0][0], points[0][1]);
        for (const point of points) {
            this.ctx.lineTo(point[0], point[1]);
        }
        this.ctx.stroke();
    }

    private startStroke(x: number, y: number) {
        this.drawing = true;
        this.lastpos.x = x;
        this.lastpos.y = y;
        this.curpos = { ...this.lastpos };

        this.current = {
            points: [[x, y]],
            color: this.color,
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
            this.current = undefined;
        }
    }
};