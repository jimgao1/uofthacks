import { DrawingCanvas } from './canvas';
import { Connection, MessageHandler } from './connection';

const identifier = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

function resizeCanvas() {
    canvas.resize(document.documentElement.clientWidth, document.documentElement.clientHeight);
    console.log("resized blyat")
}

window.addEventListener('resize', resizeCanvas);


const element = document.getElementById('thecanvas') as HTMLCanvasElement;
if (element == null) {
    throw "Fuck you";
}
const canvas = new DrawingCanvas(element, document.getElementById('fpscounter') as HTMLDivElement);

const handler: MessageHandler = {
    client_draw: msg => {
        if (msg.identifier === identifier) {
            return;
        }
        canvas.drawStroke(msg.points, msg.color);
    }
};

const connection = new Connection(handler, null as any);
connection.connect(prompt("url") || "ws://192.168.1.124:6969", prompt("name") || "Jim Fucking Gao", identifier)
.then(() => {
    console.log("connection successful");
    connection.attach();
});

canvas.strokeHandler = stroke => {
    connection.draw(stroke.points, stroke.color);
};


resizeCanvas();
window.requestAnimationFrame((function cb(timestamp) {
    window.requestAnimationFrame(cb);
    canvas.render(timestamp);
}));