// ── audio-render.js: Piano audio synthesis and WAV export ────────────────────
// Supports two backends:
//   'samples'  – loads real WAV samples from src/samples/piano/
//   'synth'    – generates piano-like tones via additive synthesis
//
// Public API:
//   bakeAudio(history, p, stateNames)  →  Buffer (WAV file bytes)

'use strict';

const fs      = require('fs');
const path    = require('path');

// Default built-in piano samples (Upright Piano KW, CC0).
// audio-render.js lives in src/, so go up one level to reach resources/.
const DEFAULT_SAMPLES_DIR = path.join(__dirname, '../resources/UprightPianoKW-small-SFZ-20190703');

// ── Music theory ──────────────────────────────────────────────────────────────

// Semitone intervals for major and minor scales (relative to root = 0)
const SCALE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
};

// MIDI note number → frequency (A4 = 69 = 440 Hz)
function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

// Note name → MIDI (e.g. "C4" → 60)
function noteNameToMidi(name) {
    const notes = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
    const m = name.match(/^([A-G])(#|b)?(\d)$/);
    if (!m) return 60;
    let semi = notes[m[1]];
    if (m[2] === '#') semi++;
    if (m[2] === 'b') semi--;
    return (parseInt(m[3]) + 1) * 12 + semi;
}

// Build list of MIDI notes within [loMidi, hiMidi] that belong to the scale
// rooted at rootMidi (e.g. 60 = C) with the given mode.
function buildScaleNotes(rootMidi, mode, loMidi, hiMidi) {
    const intervals = SCALE_INTERVALS[mode] || SCALE_INTERVALS.major;
    const notes = [];
    // Walk octaves covering the range
    for (let oct = -2; oct <= 10; oct++) {
        for (const iv of intervals) {
            const midi = rootMidi + oct * 12 + iv;
            if (midi >= loMidi && midi <= hiMidi) notes.push(midi);
        }
    }
    notes.sort((a, b) => a - b);
    return [...new Set(notes)];
}

// Assign a MIDI note to each state name deterministically using a seed.
// States cycle through the available scale notes.
function buildStateNoteMap(stateNames, scaleNotes, seed) {
    // Simple seeded shuffle so the same seed always gives the same mapping
    const arr = [...scaleNotes];
    let s = seed >>> 0;
    function rng() {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    }
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const map = {};
    stateNames.forEach((name, idx) => {
        map[name] = arr[idx % arr.length];
    });
    return map;
}

// ── Additive synthesis piano tone ─────────────────────────────────────────────
// Generates one piano note as a Float32Array of mono PCM samples.
// duration: seconds, freq: Hz, sampleRate: Hz
function synthPianoNote(freq, duration, sampleRate) {
    const n = Math.ceil(duration * sampleRate);
    const buf = new Float32Array(n);

    // Harmonic series: [relative_freq_multiplier, amplitude, decay_rate]
    // Decay rate = how quickly each partial fades (higher = faster fade)
    const harmonics = [
        [1,    1.00,  3.0],
        [2,    0.50,  4.5],
        [3,    0.25,  6.0],
        [4,    0.12,  8.0],
        [5,    0.06, 10.0],
        [6,    0.03, 12.0],
        [7,    0.015,15.0],
    ];

    const attack = Math.min(0.010, duration * 0.05);  // 10ms attack

    for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        // Global envelope: fast attack, exponential decay
        const env = (t < attack ? t / attack : 1.0) * Math.exp(-t * 2.5);
        let sample = 0;
        for (const [mult, amp, decay] of harmonics) {
            const partialEnv = Math.exp(-t * decay);
            sample += amp * partialEnv * Math.sin(2 * Math.PI * freq * mult * t);
        }
        buf[i] = sample * env;
    }

    // Normalise peak to 0.8
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf[i]));
    if (peak > 0) for (let i = 0; i < n; i++) buf[i] = buf[i] / peak * 0.8;

    return buf;
}

// ── SFZ parser & sample loader ────────────────────────────────────────────────
// Parses a .sfz file and returns an array of regions:
//   [{ lokey, hikey, pitch_keycenter, samplePath }]
// SFZ is plain text; we only need the opcodes relevant to pitch mapping.

function parseSfz(sfzText, sfzDir) {
    const regions = [];
    let current = {};
    let groupDefaults = {};

    // Tokenise: split on <header> tags and opcode=value pairs
    const tokenRe = /<(\w+)>|(\w+)\s*=\s*([^\s<]+)/g;
    let m;
    while ((m = tokenRe.exec(sfzText)) !== null) {
        if (m[1]) {
            // Header tag
            const tag = m[1].toLowerCase();
            if (tag === 'region') {
                // Start new region, inheriting group defaults
                current = Object.assign({}, groupDefaults);
            } else if (tag === 'group') {
                // Commit previous region if any
                if (current.sample) regions.push(finaliseRegion(current, sfzDir));
                current = {};
                groupDefaults = {};
            } else {
                if (current.sample) regions.push(finaliseRegion(current, sfzDir));
                current = {};
            }
        } else {
            // opcode=value
            const key = m[2].toLowerCase();
            const val = m[3];
            if (['lokey','hikey','pitch_keycenter','key'].includes(key)) {
                current[key] = sfzNoteToMidi(val);
            } else if (key === 'sample') {
                // Normalise path separator
                current.sample = val.replace(/\\/g, '/');
            }
        }
    }
    if (current.sample) regions.push(finaliseRegion(current, sfzDir));
    return regions;
}

function finaliseRegion(r, sfzDir) {
    const pc = r.pitch_keycenter !== undefined ? r.pitch_keycenter
             : r.key !== undefined ? r.key : 60;
    return {
        lokey:          r.lokey !== undefined ? r.lokey : pc,
        hikey:          r.hikey !== undefined ? r.hikey : pc,
        pitch_keycenter: pc,
        samplePath:     path.join(sfzDir, r.sample),
    };
}

// SFZ note value: can be MIDI number string ("60") or note name ("C4", "A#3")
function sfzNoteToMidi(val) {
    if (/^\d+$/.test(val)) return parseInt(val);
    // SFZ uses C-1 = MIDI 0 (so C4 = 60 in SFZ, same as standard)
    const m = val.match(/^([A-Ga-g])(#|b)?(-?\d+)$/);
    if (!m) return 60;
    const notes = {c:0,d:2,e:4,f:5,g:7,a:9,b:11};
    let semi = notes[m[1].toLowerCase()];
    if (m[2] === '#') semi++;
    if (m[2] === 'b') semi--;
    return (parseInt(m[3]) + 1) * 12 + semi;
}

// Cache: sfzPath → parsed regions array
const _sfzCache = {};

function loadSfzRegions(sfzPath) {
    if (_sfzCache[sfzPath]) return _sfzCache[sfzPath];
    if (!fs.existsSync(sfzPath)) return null;
    const text = fs.readFileSync(sfzPath, 'utf8');
    const dir  = path.dirname(sfzPath);
    const regions = parseSfz(text, dir);
    _sfzCache[sfzPath] = regions;
    return regions;
}

// Find the .sfz file in a directory (first one found)
function findSfzFile(dir) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    const sfz = files.find(f => f.toLowerCase().endsWith('.sfz'));
    return sfz ? path.join(dir, sfz) : null;
}

// Find the best region for a target MIDI note
function findRegionForNote(regions, targetMidi) {
    // First: exact range match
    let best = null;
    let bestDist = Infinity;
    for (const r of regions) {
        if (targetMidi >= r.lokey && targetMidi <= r.hikey) {
            const dist = Math.abs(targetMidi - r.pitch_keycenter);
            if (dist < bestDist) { bestDist = dist; best = r; }
        }
    }
    if (best) return best;
    // Fallback: nearest pitch_keycenter
    for (const r of regions) {
        const dist = Math.abs(targetMidi - r.pitch_keycenter);
        if (dist < bestDist) { bestDist = dist; best = r; }
    }
    return best;
}

// Parse a minimal WAV file → { sampleRate, numChannels, samples: Float32Array }
function parseWav(buffer) {
    const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const audioFormat   = dv.getUint16(20, true);  // 1=PCM, 3=float
    const numChannels   = dv.getUint16(22, true);
    const sampleRate    = dv.getUint32(24, true);
    const bitsPerSample = dv.getUint16(34, true);

    // Find data chunk (skip past fmt and any other chunks)
    let dataOffset = 12;
    while (dataOffset + 8 <= buffer.length) {
        const chunkId   = String.fromCharCode(...buffer.slice(dataOffset, dataOffset + 4));
        const chunkSize = dv.getUint32(dataOffset + 4, true);
        if (chunkId === 'data') { dataOffset += 8; break; }
        dataOffset += 8 + chunkSize;
    }

    const bytesPerSample = bitsPerSample / 8;
    const numSamples = Math.floor((buffer.length - dataOffset) / bytesPerSample / numChannels);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
        const offset = dataOffset + i * numChannels * bytesPerSample;
        let val;
        if (audioFormat === 3) {
            val = dv.getFloat32(offset, true);
        } else if (bitsPerSample === 24) {
            const lo = dv.getUint16(offset, true);
            const hi = dv.getInt8(offset + 2);
            val = ((hi << 16) | lo) / 8388608;
        } else if (bitsPerSample === 16) {
            val = dv.getInt16(offset, true) / 32768;
        } else {
            val = (dv.getUint8(offset) - 128) / 128;
        }
        samples[i] = val;
    }
    return { sampleRate, numChannels, samples };
}


// Resample Float32Array from srcRate to dstRate (linear interpolation)
function resample(samples, srcRate, dstRate) {
    if (srcRate === dstRate) return samples;
    const ratio = srcRate / dstRate;
    const outLen = Math.floor(samples.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const pos = i * ratio;
        const lo  = Math.floor(pos);
        const hi  = Math.min(lo + 1, samples.length - 1);
        const frac = pos - lo;
        out[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
    }
    return out;
}

// Pitch-shift by resampling: shiftSemitones up = faster playback = shorter
function pitchShiftResample(samples, semitones, srcSampleRate, dstSampleRate) {
    const pitchRatio = Math.pow(2, semitones / 12);
    // Playing back faster by pitchRatio raises pitch; combine with rate conversion
    const effectiveRate = srcSampleRate * pitchRatio;
    return resample(samples, effectiveRate, dstSampleRate);
}

// WAV file cache: filePath → { samples: Float32Array, sampleRate }
const _wavCache = {};

function loadWavFile(filePath) {
    if (_wavCache[filePath]) return _wavCache[filePath];
    if (!fs.existsSync(filePath)) return null;
    const buf  = fs.readFileSync(filePath);
    const wav  = parseWav(buf);
    // Mix stereo to mono
    let mono;
    if (wav.numChannels === 2) {
        mono = new Float32Array(Math.floor(wav.samples.length / 2));
        for (let i = 0; i < mono.length; i++)
            mono[i] = (wav.samples[i * 2] + wav.samples[i * 2 + 1]) * 0.5;
    } else {
        mono = wav.samples;
    }
    const result = { samples: mono, sampleRate: wav.sampleRate };
    _wavCache[filePath] = result;
    return result;
}

// Get resampled + pitch-shifted samples for targetMidi from an SFZ instrument dir.
// samplesDir: the folder the user pointed to (should contain a .sfz file).
// Returns Float32Array at dstSampleRate, or null if no SFZ found.
function getSampleNote(targetMidi, samplesDir, dstSampleRate) {
    const sfzPath = findSfzFile(samplesDir);
    if (!sfzPath) return null;

    const regions = loadSfzRegions(sfzPath);
    if (!regions || regions.length === 0) return null;

    const region = findRegionForNote(regions, targetMidi);
    if (!region) return null;

    const wav = loadWavFile(region.samplePath);
    if (!wav) return null;

    const semitones = targetMidi - region.pitch_keycenter;
    return pitchShiftResample(wav.samples, semitones, wav.sampleRate, dstSampleRate);
}


// ── Mix notes into a PCM buffer ───────────────────────────────────────────────

function addNote(pcm, notesamples, startSample, gain) {
    const end = Math.min(startSample + notesamples.length, pcm.length);
    for (let i = startSample; i < end; i++) {
        pcm[i] += notesamples[i - startSample] * gain;
    }
}

// ── WAV encoder ───────────────────────────────────────────────────────────────

function encodeWav(pcmFloat32, sampleRate) {
    // Convert to 16-bit PCM
    const numSamples = pcmFloat32.length;
    const dataBytes  = numSamples * 2;
    const buf = Buffer.alloc(44 + dataBytes);

    // Normalise to prevent clipping
    let peak = 0;
    for (let i = 0; i < numSamples; i++) peak = Math.max(peak, Math.abs(pcmFloat32[i]));
    const norm = peak > 0.95 ? 0.95 / peak : 1.0;

    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataBytes, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);          // chunk size
    buf.writeUInt16LE(1, 20);           // PCM
    buf.writeUInt16LE(1, 22);           // mono
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
    buf.writeUInt16LE(2, 32);           // block align
    buf.writeUInt16LE(16, 34);          // bits per sample
    buf.write('data', 36);
    buf.writeUInt32LE(dataBytes, 40);

    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, pcmFloat32[i] * norm));
        buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }
    return buf;
}

// ── Main export function ──────────────────────────────────────────────────────
//
// history : run_turing_machine output (detailed mode)
// p       : render params including:
//   fps, moveFrames, pauseFrames, halflife,
//   musicMode ('major'/'minor'), musicRoot ('C4' etc.),
//   musicLoNote ('C3'), musicHiNote ('C6'),
//   musicSeed (int), samplesDir (path or '' for synth)
// stateNames : array of all state names in the program
//
// Returns a Buffer containing a valid WAV file.

function bakeAudio(history, p, stateNames) {
    const SAMPLE_RATE = 44100;
    const fps         = Math.max(1, p.fps || 30);
    const pauseFrames = Math.max(0, p.pauseFrames);   // allow 0 pause
    const moveFrames  = Math.max(1, p.moveFrames);
    const halflife    = Math.max(1, p.halflife);

    // Duration of one "beat" in seconds: movement + pause, minimum 1 frame worth.
    const beatFrames   = moveFrames + pauseFrames;
    const stepDuration = Math.max(beatFrames, 1) / fps;
    // Note-on duration: let it ring for a bit longer than one step but fade naturally
    const noteDuration = Math.max(stepDuration * 3, 1.5);

    // Scale / note mapping
    const rootMidi   = noteNameToMidi(p.musicRoot  || 'C4');
    const loMidi     = noteNameToMidi(p.musicLoNote || 'C3');
    const hiMidi     = noteNameToMidi(p.musicHiNote || 'C6');
    const mode       = (p.musicMode === 'minor') ? 'minor' : 'major';
    const seed       = parseInt(p.musicSeed) || 0;

    const scaleNotes = buildScaleNotes(rootMidi, mode, loMidi, hiMidi);
    if (scaleNotes.length === 0) {
        // Fallback: chromatic within range
        for (let m = loMidi; m <= hiMidi; m++) scaleNotes.push(m);
    }

    const noteMap = buildStateNoteMap(stateNames, scaleNotes, seed);

    // Total audio duration mirrors buildFrameSequence / computeTotalFrames logic exactly.
    // (Must stay in sync with the frame-counting fix for pauseFrames=0.)
    const cooldown  = Math.ceil(9 * halflife);
    let totalFrames = 1 + pauseFrames;   // dark frame + initial pause
    for (let i = 1; i < history.length; i++) {
        const posChanged = history[i][1] !== history[i-1][1];
        if (posChanged) {
            totalFrames += moveFrames + pauseFrames;
        } else {
            // No movement: pause frames (or 1 explicit landing frame when pause=0)
            totalFrames += pauseFrames > 0 ? pauseFrames : 1;
        }
    }
    totalFrames += pauseFrames + cooldown;  // final pause + cooldown
    const totalDuration = totalFrames / fps;
    const totalSamples  = Math.ceil(totalDuration * SAMPLE_RATE);

    const pcm = new Float32Array(totalSamples);

    // Resolve samples directory once, outside the loop
    const resolvedSamplesDir =
        (p.samplesDir && fs.existsSync(p.samplesDir)) ? p.samplesDir :
        fs.existsSync(DEFAULT_SAMPLES_DIR)            ? DEFAULT_SAMPLES_DIR :
        null;

    // Walk through history and schedule notes.
    // Frame counter mirrors buildFrameSequence logic exactly.
    let frameAt = 1 + pauseFrames;  // after dark frame + initial pause

    for (let i = 1; i < history.length; i++) {
        const prev    = history[i - 1];
        const curr    = history[i];
        const prevPos = prev[1];
        const currPos = curr[1];
        const posChanged = currPos !== prevPos;

        if (posChanged) {
            // When pause=0, note fires on the last movement frame (same as buildFrameSequence).
            // When pause>0, note fires at the start of the pause block after movement.
            frameAt += moveFrames;
        }
        // frameAt now points to the moment the highlight (and note) fires.

        const timeAt   = frameAt / fps;
        const startSmp = Math.floor(timeAt * SAMPLE_RATE);

        const stateName = curr[3];
        const midi      = noteMap[stateName] !== undefined
            ? noteMap[stateName]
            : (scaleNotes[0] || 60);
        const freq = midiToFreq(midi);

        // State changed → loud (0.9); self-loop (same state) → soft (0.35)
        const gain = (curr[3] !== prev[3]) ? 0.9 : 0.35;

        let noteSamples;
        if (resolvedSamplesDir) {
            noteSamples = getSampleNote(midi, resolvedSamplesDir, SAMPLE_RATE);
        }
        if (!noteSamples) {
            noteSamples = synthPianoNote(freq, noteDuration, SAMPLE_RATE);
        }

        addNote(pcm, noteSamples, startSmp, gain);

        // Advance past the pause block (or the 1 landing frame when pause=0 and no movement)
        if (pauseFrames > 0) {
            frameAt += pauseFrames;
        } else if (!posChanged) {
            frameAt += 1;   // the explicit landing frame inserted by buildFrameSequence
        }
        // (pause=0 with movement: no extra frames after the last move frame)
    }

    return encodeWav(pcm, SAMPLE_RATE);
}

module.exports = { bakeAudio, buildStateNoteMap, buildScaleNotes, noteNameToMidi, midiToFreq };
