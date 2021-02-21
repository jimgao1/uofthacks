import { DrawingCanvas } from './historyCanvas';

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
const sett = document.getElementById('settime') as HTMLInputElement;
const trans = document.getElementById('trans') as HTMLDivElement;

if (element == null) {
    throw "Fuck you";
}
const canvas = new DrawingCanvas(element, sett, trans, document.getElementById('fpscounter') as HTMLDivElement, document.getElementById('userlist') as HTMLDivElement);

resizeCanvas();

window.requestAnimationFrame((function cb(timestamp) {
    window.requestAnimationFrame(cb);
    canvas.render(timestamp);
}));