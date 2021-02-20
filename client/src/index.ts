import { DrawingCanvas } from './canvas';

const element = document.getElementById('thecanvas') as HTMLCanvasElement;
if (element == null) {
    throw "Fuck you";
}
const canvas = new DrawingCanvas(element);

window.requestAnimationFrame((function cb(timestamp) {
    window.requestAnimationFrame(cb);
    canvas.render(timestamp);
}));