import { DrawingCanvas } from './canvas';
import { Connection } from './connection';

const connection = new Connection(null as any, null as any);
connection.connect(prompt("url") || "ws://192.168.1.124:6969", prompt("name") || "Jim Fucking Gao")
.then(() => {
    console.log("connection successful");
});

const element = document.getElementById('thecanvas') as HTMLCanvasElement;
if (element == null) {
    throw "Fuck you";
}
const canvas = new DrawingCanvas(element);

window.requestAnimationFrame((function cb(timestamp) {
    window.requestAnimationFrame(cb);
    canvas.render(timestamp);
}));