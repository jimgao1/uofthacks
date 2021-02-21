import { DrawingCanvas } from './historyCanvas';

const queryDict: { [key: string]: string } = {};
location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});

const url = queryDict['url'] || window.location.hostname;

function resizeCanvas() {
    canvas.resize(document.documentElement.clientWidth, document.documentElement.clientHeight);
    console.log("resized blyat")
}

window.addEventListener('resize', resizeCanvas);

const element = document.getElementById('thecanvas') as HTMLCanvasElement;
const sett = document.getElementById('settime') as HTMLInputElement;
const trans = document.getElementById('trans') as HTMLDivElement;

if (element == null) {
    throw "Fuck you";
}
const canvas = new DrawingCanvas(element, sett, trans, url, document.getElementById('fpscounter') as HTMLDivElement, document.getElementById('userlist') as HTMLDivElement);

resizeCanvas();

window.requestAnimationFrame((function cb(timestamp) {
    window.requestAnimationFrame(cb);
    canvas.render(timestamp);
}));