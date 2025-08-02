// Daniel Shiffman
// http://codingtra.in
// http://patreon.com/codingtrain
// Code for: https://youtu.be/IKB1hWWedMk

// Edited by SacrificeProductions

let presets = [
  "assets/ArgoFox.mp3",
  "assets/Island.mp3",
  "assets/Spectrum.mp3",
  "assets/Tobu.mp3",
  "assets/Tranquillity.mp3",
];

let cols, rows;
let scl = 20;
let widthPercentage = 0.8;
let heightPercentage = 0.9;

let flying = 0;

let terrain = [];

let fps = 60;

let audioCtx;
let analyser;
let audioSource;
let audioDataArray;
let isAudioCapturing = false;

let particles = [];
let energyWaves = [];
let colorPalettes = {};
let beatThreshold = 0;
let lastBeatTime = 0;

class Particle {
  constructor() {
    this.reset();
    this.life = random(100, 255);
  }

  reset() {
    this.x = random(-width / 2, width / 2);
    this.y = random(-height / 2, height / 2);
    this.z = random(-200, 200);
    this.vx = random(-2, 2);
    this.vy = random(-2, 2);
    this.vz = random(-1, 1);
    this.size = random(2, 8);
    this.life = 255;
  }

  update(energy, bassEnergy) {
    this.x += this.vx + random(-energy * 0.02, energy * 0.02);
    this.y += this.vy + random(-energy * 0.02, energy * 0.02);
    this.z += this.vz + random(-bassEnergy * 0.02, bassEnergy * 0.02);

    this.life -= 1;
    if (this.life <= 0) this.reset();

    if (abs(this.x) > width || abs(this.y) > height || abs(this.z) > 300) {
      this.reset();
    }
  }

  display(col) {
    push();
    translate(this.x, this.y, this.z);
    fill(red(col), green(col), blue(col), this.life);
    noStroke();
    sphere(this.size);
    pop();
  }
}

function preload() {
  sound = loadSound(presets[1]);
}

function setup() {
  let w = windowWidth * widthPercentage;
  let h = windowHeight * heightPercentage;
  createCanvas(w, h - 100, WEBGL);
  frameRate(fps);
  cols = w / scl;
  rows = h / scl;

  for (let x = 0; x < cols; x++) {
    terrain[x] = [];
    for (let y = 0; y < rows; y++) {
      terrain[x][y] = 0;
    }
  }

  colorPalettes = {
    bass: [color(255, 80, 120), color(255, 120, 180), color(200, 50, 100)],
    mid: [color(100, 255, 200), color(150, 255, 150), color(50, 200, 150)],
    treble: [color(255, 255, 100), color(255, 200, 50), color(200, 150, 0)],
  };

  for (let i = 0; i < 200; i++) {
    particles.push(new Particle());
  }

  file = createFileInput(handleFileUpload);
  fft = new p5.FFT();
}

async function startAudioCapture() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    if (stream.getAudioTracks().length === 0) {
      throw new Error("No audio tracks captured");
    }

    audioCtx = new AudioContext();
    audioSource = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    audioSource.connect(analyser);

    audioDataArray = new Uint8Array(analyser.frequencyBinCount);
    isAudioCapturing = true;

    document.getElementById("capture-audio").textContent = "Audio Capturing...";
    document.getElementById("capture-audio").disabled = true;
  } catch (error) {
    console.warn("Audio capture failed:", error.message);
    isAudioCapturing = false;
    document.getElementById("capture-audio").textContent =
      "Capture Failed - Try Again";
  }
}

function windowResized() {
  resizeCanvas(
    windowWidth * widthPercentage,
    windowHeight * heightPercentage - 100
  );
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
  let spectrum;

  if (isAudioCapturing) {
    analyser.getByteFrequencyData(audioDataArray);
    spectrum = audioDataArray;
  } else {
    spectrum = fft.analyze();
  }

  let bassEnergy = isAudioCapturing
    ? spectrum.slice(0, 60).reduce((a, b) => a + b, 0) / 60
    : fft.getEnergy("bass");
  let midEnergy = isAudioCapturing
    ? spectrum.slice(60, 300).reduce((a, b) => a + b, 0) / 240
    : fft.getEnergy("mid");
  let trebleEnergy = isAudioCapturing
    ? spectrum.slice(600, 1024).reduce((a, b) => a + b, 0) / 424
    : fft.getEnergy("treble");

  let dynamicBg = lerpColor(
    color(5, 5, 20),
    color(bassEnergy * 0.7, midEnergy * 0.6, trebleEnergy * 0.9),
    0.9
  );
  background(dynamicBg);

  detectBeat(bassEnergy);
  updateParticles(spectrum, bassEnergy, midEnergy, trebleEnergy);
  // updateEnergyWaves(spectrum);

  calculateTerrain(spectrum);
  drawMultiTerrain(spectrum, bassEnergy, midEnergy, trebleEnergy);
  // drawEnhancedCircles(spectrum, bassEnergy, midEnergy, trebleEnergy);
  drawParticles();
  // drawEnergyWaves();
  drawFloatingElements(spectrum);
}

function calculateTerrain(spectrum) {
  let bassEnergy, trebleEnergy, centroid;

  if (isAudioCapturing && spectrum) {
    bassEnergy = spectrum.slice(0, 60).reduce((a, b) => a + b, 0) / 60;
    trebleEnergy = spectrum.slice(600, 1024).reduce((a, b) => a + b, 0) / 424;
    centroid =
      spectrum.reduce((sum, val, i) => sum + val * i, 0) /
      spectrum.reduce((a, b) => a + b, 1);
  } else {
    centroid = fft.getCentroid();
    bassEnergy = fft.getEnergy("bass");
    trebleEnergy = fft.getEnergy("treble");
  }

  let mappedYVolume = map(bassEnergy, 0, 255, 0, 0.02);
  let mappedXVolume = map(centroid, 0, 255, 0, 0.01);
  let mappedXFlightVolume = map(trebleEnergy, 0, 128, 0, 0.4);

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
  let w = windowWidth * widthPercentage;
  let h = windowHeight * heightPercentage;

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

function detectBeat(bassEnergy) {
  if (bassEnergy > beatThreshold && millis() - lastBeatTime > 200) {
    lastBeatTime = millis();
    for (let i = 0; i < 20; i++) {
      particles.push(new Particle());
    }
    if (particles.length > 200) {
      particles.splice(0, 50);
    }
  }
  beatThreshold = lerp(beatThreshold, bassEnergy * 0.8, 0.1);
}

function updateParticles(spectrum, bassEnergy, midEnergy, trebleEnergy) {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(midEnergy + trebleEnergy, bassEnergy);
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (let particle of particles) {
    let col = lerpColor(
      colorPalettes.bass[0],
      colorPalettes.treble[1],
      noise(particle.x * 0.01, particle.y * 0.01, frameCount * 0.01)
    );
    particle.display(col);
  }
}

function updateEnergyWaves(spectrum) {
  if (frameCount % 30 === 0) {
    energyWaves.push({
      x: 0,
      y: 0,
      z: 0,
      radius: 0,
      maxRadius: 300,
      life: 255,
      energy: spectrum.slice(0, 100).reduce((a, b) => a + b, 0) / 100,
    });
  }

  for (let i = energyWaves.length - 1; i >= 0; i--) {
    let wave = energyWaves[i];
    wave.radius += 5;
    wave.life -= 3;

    if (wave.life <= 0 || wave.radius > wave.maxRadius) {
      energyWaves.splice(i, 1);
    }
  }
}

function drawEnergyWaves() {
  for (let wave of energyWaves) {
    push();
    translate(wave.x, wave.y, wave.z);
    noFill();
    stroke(255, 100, 200, wave.life);
    strokeWeight(2 + wave.energy * 0.05);
    circle(0, 0, wave.radius * 2);
    pop();
  }
}

function drawFloatingElements(spectrum) {
  push();
  for (let i = 0; i < 12; i++) {
    let angle = frameCount * 0.02 + (i * TWO_PI) / 12;
    let radius = 150 + spectrum[i * 8] * 0.5;
    let x = cos(angle) * radius;
    let y = sin(angle) * radius;
    let z = sin(frameCount * 0.01 + i) * 50 + 100;

    push();
    translate(x, y, z);
    rotateY(frameCount * 0.02 + i);

    let col = lerpColor(
      colorPalettes.bass[i % 3],
      colorPalettes.treble[i % 3],
      sin(frameCount * 0.02 + i) * 0.5 + 0.5
    );
    fill(col);
    noStroke();
    box(10 + spectrum[i * 8] * 0.1);
    pop();
  }
  pop();
}

function drawMultiTerrain(spectrum, bassEnergy, midEnergy, trebleEnergy) {
  let w = windowWidth * widthPercentage;
  let h = windowHeight * heightPercentage;

  translate(0, 30, 120);
  rotateX(PI / 2.1);

  for (let layer = 0; layer < 3; layer++) {
    push();
    translate(0, 0, -layer * 30);

    let layerAlpha = map(layer, 0, 2, 100, 20);
    let layerColor;

    if (layer === 0) {
      layerColor = lerpColor(
        colorPalettes.bass[0],
        colorPalettes.bass[1],
        bassEnergy / 255
      );
    } else if (layer === 1) {
      layerColor = lerpColor(
        colorPalettes.mid[0],
        colorPalettes.mid[1],
        midEnergy / 255
      );
    } else {
      layerColor = lerpColor(
        colorPalettes.treble[0],
        colorPalettes.treble[1],
        trebleEnergy / 255
      );
    }

    fill(red(layerColor), green(layerColor), blue(layerColor), layerAlpha);

    translate(-w / 2, -h / 2);
    for (let y = 0; y < rows - 1; y++) {
      beginShape(TRIANGLE_STRIP);
      for (let x = 0; x < cols; x++) {
        let heightMod = layer * 20;
        vertex(x * scl, y * scl, terrain[x][y] + heightMod);
        vertex(x * scl, (y + 1) * scl, terrain[x][y + 1] + heightMod);
      }
      endShape();
    }
    pop();
  }
}

function drawEnhancedCircles(spectrum, bassEnergy, midEnergy, trebleEnergy) {
  push();
  rotateX(PI / 2);

  for (let i = 0; i < 16; i++) {
    let angle = frameCount * 0.01 + (i * TWO_PI) / 16;
    let x = cos(angle) * (200 + spectrum[i * 4] * 0.3);
    let y = sin(angle) * (200 + spectrum[i * 4] * 0.3);
    let size = spectrum[i * 4] * 0.8 + 20;

    let col;
    if (i < 5) {
      col = lerpColor(
        colorPalettes.bass[0],
        colorPalettes.bass[1],
        bassEnergy / 255
      );
    } else if (i < 11) {
      col = lerpColor(
        colorPalettes.mid[0],
        colorPalettes.mid[1],
        midEnergy / 255
      );
    } else {
      col = lerpColor(
        colorPalettes.treble[0],
        colorPalettes.treble[1],
        trebleEnergy / 255
      );
    }

    fill(red(col), green(col), blue(col), 150);
    noStroke();

    push();
    translate(x, y, sin(frameCount * 0.02 + i) * 30);
    sphere(size * 0.3);
    pop();
  }
  pop();
}
