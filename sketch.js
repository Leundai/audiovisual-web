// Daniel Shiffman
// http://codingtra.in
// http://patreon.com/codingtrain
// Code for: https://youtu.be/IKB1hWWedMk

// Edited by SacrificeProductions

let presets = ["assets/ArgoFox.mp3", "assets/Island.mp3", "assets/Spectrum.mp3", "assets/Tobu.mp3", "assets/Tranquillity.mp3"];

let cols, rows;
let scl = 20;
let w = 1600;
let h = 700;

let flying = 0;

let terrain = [];

let fps = 60;

function preload() {
  sound = loadSound(presets[1]);
}

function setup() {
  createCanvas(1600, 600, WEBGL);
  frameRate(fps);
  cols = w / scl;
  rows = h / scl;

  for (let x = 0; x < cols; x++) {
    terrain[x] = [];
    for (let y = 0; y < rows; y++) {
      terrain[x][y] = 0; //specify a default value for now
    }
  }
  
  file = createFileInput(handleFileUpload);
  
  fft = new p5.FFT();
}

function handleFileUpload(file) {
  sound.stop();

  if (file.type == "audio") {
    sound = loadSound(file, handleSuccessUpload);
  }
}

function handleLoadPreset(index) {
  sound.stop();
  sound = loadSound(presets[index], handleSuccessUpload);
}

function handleSuccessUpload() {
  sound.amp(0.2);
  togglePlay();
  successfulUpload = true;
}

function togglePlay() {
  if (sound.isPlaying()) {
    sound.pause();
  } else {
    sound.play();
  }
}

function draw() {
  let spectrum = fft.analyze();

  background(12);
  calculateTerrain();
  drawTerrain();
  drawCircles(spectrum);
}

function calculateTerrain() {
  let centroid = fft.getCentroid();
  let mappedYVolume = map(fft.getEnergy("bass"), 0, 255, 0, .02);
  let mappedXVolume = map(centroid, 0, 255, 0, .01);
  let mappedXFlightVolume = map(fft.getEnergy("treble"), 0, 128, 0, .1);

  flying -= 0.006 + mappedXFlightVolume;
  let yoff = flying;
  for (let y = 0; y < rows; y++) {
    let xoff = 0;
    for (let x = 0; x < cols; x++) {
      terrain[x][y] = map(noise(xoff, yoff, mappedXVolume), 0, 1, -150, 50);
      xoff += 0.04 + mappedYVolume;
    }
    yoff += 0.05;
  }
}

function drawTerrain() {
  translate(0, 30, 120);
  rotateX(PI / 2.1);
  fill(200, 200, 200, 50);
  translate(-w / 2, -h / 2);
  for (let y = 0; y < rows - 1; y++) {
    beginShape(TRIANGLE_STRIP);
    for (let x = 0; x < cols; x++) {
      vertex(x * scl, y * scl, terrain[x][y]);
      vertex(x * scl, (y + 1) * scl, terrain[x][y + 1]);
    }
    endShape();
  }
}

function drawCircles(spectrum) {
  let r = spectrum[32];
  let g = spectrum[128/2];
  let b = spectrum[96];
  let c = color(r, g, b);
  let isUpper = false;

  fill(c);
  rotateX(PI / 2);
  for (let i = 0; i < 8; i++) {
    circle(-50 + (i * 250), isUpper ? 200 : 100, spectrum[i * 8]);
    isUpper = !isUpper;
  }
}