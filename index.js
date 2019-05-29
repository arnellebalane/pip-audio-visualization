const audioSrc = '/audios/01.mp3';
const audioCtx = new AudioContext();

const canvas = document.querySelector('canvas');
const canvasCtx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const visualizationHeight = canvas.height / 2;
const color1 = [44, 94, 67];
const color2 = [202, 100, 78];
let hueOffset = 0;

function loadAudio(path) {
    return fetch(path).then(response => response.arrayBuffer());
}

function draw(audioData) {
    const interval = Math.ceil(canvas.width / audioData.length);
    const center = Math.ceil(canvas.height / 2);

    const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, `hsl(${color1[0] + hueOffset}, ${color1[1]}%, ${color1[2]}%)`);
    gradient.addColorStop(1, `hsl(${color2[0] + hueOffset}, ${color2[1]}%, ${color2[2]}%)`);
    hueOffset += 0.1;

    canvasCtx.lineWidth = 5;
    canvasCtx.strokeStyle = gradient;
    canvasCtx.fillStyle = '#111';

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.beginPath();
    canvasCtx.moveTo(0, center + audioData[0]);

    for (let i = 1, l = audioData.length; i < l; i++) {
        canvasCtx.lineTo(i * interval, audioData[i] * visualizationHeight + center);
    }

    canvasCtx.stroke();
}

(async () => {
    const audio = await loadAudio(audioSrc);

    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = await audioCtx.decodeAudioData(audio);

    const analyserNode = audioCtx.createAnalyser();
    const audioData = new Float32Array(analyserNode.frequencyBinCount);

    sourceNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    document.addEventListener('click', () => {
        sourceNode.start();
    }, {once: true});

    (function renderLoop() {
        requestAnimationFrame(renderLoop);

        analyserNode.getFloatTimeDomainData(audioData);
        draw(audioData);
    })();
})();
