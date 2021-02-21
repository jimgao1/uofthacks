import { DrawingCanvas } from './canvas';
import { Connection, MessageHandler } from './connection';
import { WebRTCConnection } from './webrtc';

const queryDict: { [key: string]: string } = {};
location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});

const url = queryDict['url'] || window.location.hostname;

const identifier = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

const rtc = new WebRTCConnection(document.getElementById("audio") as HTMLDivElement);
rtc.getUserMedia().then(() => {
    return rtc.connect(`wss://${url}:46968/`, identifier);
    // return rtc.connect('ws://localhost:6968/', identifier);
}).then(() => {
    rtc.attach();
});

function resizeCanvas() {
    canvas.resize(document.documentElement.clientWidth, document.documentElement.clientHeight);
    console.log("resized blyat")
}

var timer; 
function startTimer() { 
    canvas.getUsers();
    timer = setInterval(function() {
        canvas.getUsers(); 
    }, 5000); 
} 

window.addEventListener('resize', resizeCanvas);


const element = document.getElementById('thecanvas') as HTMLCanvasElement;
const setc = document.getElementById('setcolor') as HTMLInputElement;
const setw = document.getElementById('setwidth') as HTMLInputElement;
if (element == null) {
    throw "Fuck you";
}
const canvas = new DrawingCanvas(element, setc, setw, url, document.getElementById('fpscounter') as HTMLDivElement, document.getElementById('userlist') as HTMLDivElement);

const handler: MessageHandler = {
    client_draw: msg => {
        if (msg.identifier === identifier) {
            return;
        }
        canvas.drawStroke(msg.points, msg.color);
    }
};

const connection = new Connection(handler, null as any);
connection.connect(`wss://${url}:46969`, queryDict['name'] || "Jim Fucking Gao", identifier)
.then(() => {
    console.log("connection successful");
    console.log(`token: ${connection.token}`)
    connection.attach();

    document.getElementById("overlay")?.remove();
});

canvas.strokeHandler = stroke => {
    connection.draw(stroke.points, stroke.color);
};

resizeCanvas();
startTimer();

window.requestAnimationFrame((function cb(timestamp) {
    window.requestAnimationFrame(cb);
    canvas.render(timestamp);
}));