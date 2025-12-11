
// Professional Sound Engine using Web Audio API
// No external assets required.

const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
};

export const playSound = (type: 'CLICK' | 'SUCCESS' | 'ERROR' | 'LOGIN' | 'HOVER' | 'MEOW') => {
    try {
        switch (type) {
            case 'CLICK':
                // Subtle click
                playTone(400, 'sine', 0.1, 0.05);
                break;
            case 'HOVER':
                // Very subtle hover
                playTone(200, 'sine', 0.05, 0.01);
                break;
            case 'SUCCESS':
                // Pleasant chime (Two tones)
                playTone(500, 'sine', 0.2, 0.1);
                setTimeout(() => playTone(800, 'sine', 0.3, 0.1), 100);
                break;
            case 'ERROR':
                // Soft thud
                playTone(150, 'triangle', 0.2, 0.1);
                break;
            case 'LOGIN':
                // Startup sound
                playTone(300, 'sine', 0.4, 0.1);
                setTimeout(() => playTone(400, 'sine', 0.4, 0.1), 100);
                setTimeout(() => playTone(600, 'sine', 0.8, 0.1), 200);
                break;
            case 'MEOW':
                // Meow simulation
                // Pitch sweep: 800 -> 1200 -> 600
                if (ctx.state === 'suspended') ctx.resume();
                const oscc = ctx.createOscillator();
                const gainn = ctx.createGain();
                oscc.type = 'triangle';
                oscc.frequency.setValueAtTime(800, ctx.currentTime);
                oscc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
                oscc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);

                gainn.gain.setValueAtTime(0.1, ctx.currentTime);
                gainn.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

                oscc.connect(gainn);
                gainn.connect(ctx.destination);
                oscc.start();
                oscc.stop(ctx.currentTime + 0.4);
                break;
        }
    } catch (e) {
        // Silent fail if audio context not supported
    }
};
