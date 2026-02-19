/**
 * ZzFX - Zuper Zmall Zound Zynth - Micro Edition
 * MIT License - Copyright 2019 Frank Force
 * https://github.com/KilledByAPixel/ZzFX
 */
export const zzfx = (...t) => zzfxP(zzfxG(...t));

// zzfxP() - the sound player
export const zzfxP = (...t) => {
    let e = zzfxX.createBufferSource(),
        f = zzfxX.createBuffer(t.length, t[0].length, zzfxR);
    t.map((d, i) => f.getChannelData(i).set(d)), e.buffer = f, e.connect(zzfxX.destination), e.start();
    return e;
};

// zzfxG() - the sound generator
export const zzfxG = (q = 1, t = .05, c = 220, e = 0, f = 0, h = .1, M = 0, r = 1, z = 0, Z = 0, b = 0, m = 0, w = 0, g = 0, J = 0, K = 0, E = 0, j = 1, R = 0, P = 0) => {
    let v = 2 * Math.PI,
        H = 44100,
        d = (d = 0) => 0 < d ? 1 : -1,
        l = d => d * (0 < d ? 1 : -1),
        L = zzfxR * (t + e + f + h + M),
        n = M * zzfxR,
        I = h * zzfxR,
        k = f * zzfxR,
        D = e * zzfxR,
        A = t * zzfxR,
        F = 0,
        B = 0,
        N = [],
        O = [],
        S = 0,
        C = 0,
        y = 0,
        T = 0,
        U = 0,
        V = 0,
        W = 0,
        X = 0,
        Y = 0;
    for (C = 0; C < L; C = 0 | C + 1) {
        if (!(B++ < A + D + k + I + n)) {
            B = 0, F = F + 1 | 0;
        }
        // bit crush
        Y = (F < 1 ? t : F < 2 ? e : F < 3 ? f : F < 4 ? h : M) * zzfxR;
        y = (C / L);
        S = Math.sin(T * v * (1 - j * y)); // frequency

        // waveform shape
        // 0:sin, 1:triangle, 2:saw, 3:tan, 4:noise, 5:sine-fold
        if (R) S = R < 2 ? S > 0 ? 1 : -1 : R < 3 ? S < -.5 ? -1 : S > .5 ? 1 : S * 2 : d(S) * (Math.abs(S) * 2 - 1);

        S *= q * zzfxV * (F < 1 ? C / Y : F < 5 ? 1 - (C - A - D - k - I) / n : 0); // volume

        S = J ? 1 - K + K * Math.sin(2 * Math.PI * C / (J * zzfxR)) : 1; // tremolo
        S = d(S) * Math.abs(S) ** r * q * zzfxV * (1 - j * (C / L)); // decay

        // bit crush
        P && (S = d(S) * (0 | Math.abs(S) / P) * P);

        // delay
        let output = S;
        if (w) {
            let delayIndex = (C - w * zzfxR) | 0;
            if (delayIndex >= 0) output += O[delayIndex] * g;
        }
        O[C] = output;
    }
    return [O]; // Stereo support removed for micro version consistency, returns mono buffer array
};

// zzfxV - global volume
export const zzfxV = .3;

// zzfxR - sample rate
export const zzfxR = 44100;

// zzfxX - audio context
export const zzfxX = new (window.AudioContext || window.webkitAudioContext);
