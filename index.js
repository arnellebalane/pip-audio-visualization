// AUDIO-RELATED DEFINITIONS

const audioSrc = 'song.mp3';

let audioEl;
let audioData;
let audioCtx;
let sourceNode;
let analyserNode;

function loadAudio() {
    return new Promise(resolve => {
        audioEl = new Audio();
        audioEl.oncanplaythrough = resolve;

        audioEl.src = audioSrc;
        audioEl.load();
    });
}

async function setupAudio() {
    // Safari: webkitAudioContext
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    sourceNode = audioCtx.createMediaElementSource(audioEl);

    analyserNode = audioCtx.createAnalyser();
    if (analyserNode.getFloatTimeDomainData) {
        audioData = new Float32Array(analyserNode.frequencyBinCount);
    } else {
        // Safari: Only supports getByteTimeDomainData, which requires a
        // Uint8Array object.
        audioData = new Uint8Array(analyserNode.frequencyBinCount);
    }

    sourceNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
}

function startAudio() {
    return audioEl.play();
}

function stopAudio() {
    return audioEl.pause();
}

function isPlayingAudio() {
    return !audioEl.paused;
}

function readAudio() {
    if (analyserNode.getFloatTimeDomainData) {
        analyserNode.getFloatTimeDomainData(audioData);
    } else {
        // Safari: Doesn't have getFloatTimeDomainData yet.
        analyserNode.getByteTimeDomainData(audioData);
    }
}



// GRAPHICS-RELATED DEFINITIONS

const artworkSrc = 'artwork.jpg';

let canvas;
let canvasCtx;
let artworkEl;
let isLooping = false;
let hueRotate = 0;

const CANVAS_SIZE = 500;
const RADIUS_BASE = 150;
const RADIUS_MAX_DELTA = 70;
const LINES_COUNT = 90;
const ANGLE_INTERVAL = Math.PI * 2 / LINES_COUNT;

async function setupGraphics() {
    await new Promise(resolve => {
        artworkEl = new Image();
        artworkEl.onload = resolve;

        artworkEl.src = artworkSrc;
    });

    canvas = document.querySelector('canvas');
    canvasCtx = canvas.getContext('2d');

    canvas.width = 500;
    canvas.height = 500;
}

function loopGraphics() {
    requestAnimationFrame(loopGraphics);

    if (isPlayingAudio()) {
        readAudio();
        drawGraphics();
    }
}

function drawGraphics() {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.drawImage(artworkEl, 0, 0, canvas.width, canvas.height);

    if (!isLooping) return;

    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const center = getCenter();

    const gradient = canvasCtx.createRadialGradient(
        center.x, center.y, RADIUS_BASE - RADIUS_MAX_DELTA,
        center.x, center.y, RADIUS_BASE + RADIUS_MAX_DELTA
    );
    gradient.addColorStop(0, `hsl(${214 + hueRotate}, 97%, 59%)`);
    gradient.addColorStop(1, `hsl(${336 + hueRotate}, 88%, 46%)`);
    hueRotate += 0.5;

    canvasCtx.strokeStyle = gradient;
    canvasCtx.lineWidth = 10;
    canvasCtx.lineCap = 'round';

    for (let i = 0; i < LINES_COUNT; i++) {
        const angle = ANGLE_INTERVAL * i;
        const distance = getDataValue(i) * RADIUS_MAX_DELTA + RADIUS_BASE;

        const basePoint = getPointAtAngle(center, angle, RADIUS_BASE);
        const dataPoint = getPointAtAngle(center, angle, distance);

        canvasCtx.beginPath();
        canvasCtx.moveTo(basePoint.x, basePoint.y);
        canvasCtx.lineTo(dataPoint.x, dataPoint.y);
        canvasCtx.stroke();
    }
}

function getCenter() {
    return {
        x: canvas.width / 2,
        y: canvas.height / 2
    };
}

function getPointAtAngle(origin, angle, distance) {
    return {
        x: Math.cos(angle) * distance + origin.x,
        y: Math.sin(angle) * distance + origin.y
    };
}

function getDataValue(i) {
    const size = audioData.length / LINES_COUNT;
    const index = i * size;
    const offset = Math.floor(size / 2);
    const start = index - offset * 8;
    const end = index + offset * 8;

    const values = [];
    if (start < 0) {
        values.push(...audioData.slice(start + audioData.length));
        values.push(...audioData.slice(0, end));
    } else if (end >= audioData.length) {
        values.push(...audioData.slice(start));
        values.push(...audioData.slice(0, end - audioData.length));
    } else {
        values.push(...audioData.slice(start, end));
    }

    const isUint8Array = audioData instanceof Uint8Array;

    return values.reduce((sum, value) => {
        if (isUint8Array) {
            // Safari: We transform the Uint8Array data to make it look as if
            // it's a Float32Array data.
            return sum + (value / 255 - 0.5);
        }
        return sum + value;
    }, 0) / values.length;
}



// PICTURE-IN-PICTURE BEHAVIOR

const button = document.querySelector('.pip');
const video = document.createElement('video');

if (document.pictureInPictureEnabled) {
    button.addEventListener('click', async e => {
        if (isPlayingAudio()) {
            e.stopPropagation();
        }

        if (!document.pictureInPictureElement) {
            video.srcObject = canvas.captureStream();

            await video.play();
            await video.requestPictureInPicture();
        } else {
            await document.exitPictureInPicture();
        }
    });
} else {
    button.disabled = true;
    button.title = 'Picture-in-Picture is not supported.';
}



// APP INITIALIZATION

(async () => {
    await loadAudio();
    await setupGraphics();
    drawGraphics();

    document.addEventListener('click', async () => {
        if (!isLooping) {
            isLooping = true;

            await setupAudio();
            loopGraphics();
        }

        return isPlayingAudio()
            ? await stopAudio()
            : await startAudio();
    });
})();
