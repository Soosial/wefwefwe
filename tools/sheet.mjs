// Character test sheet: renders poses of every character into out/sheet.png
import { Surface, rect, gradV } from '../src/core/fb.mjs';
import { savePNG } from '../src/core/png.mjs';
import { text } from '../src/core/font.mjs';
import { drawClawd, clawdWalk } from '../src/chars/clawd.mjs';
import { drawCodex, codexWalk } from '../src/chars/codex.mjs';
import { drawGemini } from '../src/chars/gemini.mjs';
import { drawQwen } from '../src/chars/qwen.mjs';
import { drawWhale, drawKimi, drawZ, drawUser } from '../src/chars/rivals.mjs';

const s = new Surface(960, 600);
gradV(s, 0, 0, 960, 600, [[0, '#1b1b2a'], [1, '#2a2440']]);
const row = (y, label) => text(s, label, 4, y - 70, { color: '#8a8aa0' });

row(80, 'clawd: open happy sad teary shock angry laugh blink | walk | arms up | squash');
const cl = [
  { eyes: 'open' }, { eyes: 'happy', mouth: 'big' }, { eyes: 'sad', mouth: 'frown' }, { eyes: 'teary', mouth: 'wobble', tears: 1 },
  { eyes: 'shock', mouth: 'shout' }, { eyes: 'angry', mouth: 'flat' }, { eyes: 'laugh', mouth: 'big' }, { eyes: 'blink' },
  { ...clawdWalk(0) }, { ...clawdWalk(0.5) }, { armL: -12, armR: -12, eyes: 'happy', mouth: 'open' }, { sq: 2, eyes: 'closed', mouth: 'cat' }, { sq: -2, eyes: 'star', mouth: 'o' },
];
cl.forEach((p, i) => drawClawd(s, 36 + i * 70, 80, p));

row(170, 'codex: prompt / faces / text / walk / hands');
const cx = [
  { screen: { mode: 'prompt' } }, { screen: { mode: 'face', face: 'happy' } }, { screen: { mode: 'face', face: 'wide' } }, { screen: { mode: 'face', face: 'angry' } },
  { screen: { mode: 'face', face: 'sad' } }, { screen: { mode: 'face', face: 'heart' } }, { screen: { mode: 'text', lines: ['GG'] } }, { screen: { mode: 'red', lines: ['403', 'DENIED'] } },
  { screen: { mode: 'text', lines: ['> sol'], left: true, cursor: true } }, { ...codexWalk(0.25), handL: [-2, -14], handR: [3, -14], screen: { mode: 'face', face: 'squint' } }, { screen: { mode: 'face', face: 'smug' } }, { screen: { mode: 'face', face: 'eyes' } },
];
cx.forEach((p, i) => drawCodex(s, 38 + i * 76, 175, p));

row(270, 'gemini: base / happy / sad gray / teary / sharp / spin / squash / hands up / argon');
const gm = [
  {}, { eyes: 'happy', mouth: 'open' }, { eyes: 'sad', mouth: 'frown', sat: 0.15, sharp: 0.85, R: 24 }, { eyes: 'teary', mouth: 'wobble', tears: 1, sat: 0.3, sharp: 0.8 },
  { sharp: 0.56, eyes: 'star', mouth: 'big' }, { rot: 0.4, eyes: 'happy' }, { sy: 0.85, sx: 1.12, eyes: 'closed', mouth: 'cat' }, { handL: [-1, -12], handR: [1, -12], eyes: 'happy', mouth: 'big' },
  { core: 7, sharp: 0.6, eyes: 'happy', mouth: 'smile' }, { eyes: 'shock', mouth: 'shout' }, { eyes: 'angry', mouth: 'flat' },
];
gm.forEach((p, i) => drawGemini(s, 40 + i * 84, 272, p));

row(370, 'qwen: base / sneaky glasses / feet / scared / orange / squash');
const qw = [
  {}, { glasses: true, mouth: 'smirk' }, { feet: [2, 0], glasses: true, eyes: 'happy' }, { eyes: 'shock', mouth: 'shout', handL: [-2, -12], handR: [2, -12] },
  { orange: 0.6, eyes: 'happy', mouth: 'cat' }, { sy: 0.88, sx: 1.08, eyes: 'closed' }, { eyes: 'laugh', mouth: 'big' }, { glasses: 'slip', eyes: 'shock', mouth: 'o' },
];
qw.forEach((p, i) => drawQwen(s, 42 + i * 86, 372, p));

row(470, 'rivals: whale / laugh / kimi / z / users');
drawWhale(s, 70, 470, {});
drawWhale(s, 190, 470, { mouth: 'laugh', eyes: 'laugh', tail: 1 });
drawKimi(s, 290, 470, {});
drawKimi(s, 350, 470, { eyes: 'laugh', mouth: 'big' });
drawZ(s, 410, 470, {});
drawZ(s, 470, 470, { eyes: 'laugh', mouth: 'open' });
for (let i = 0; i < 14; i++) drawUser(s, 520 + i * 20, 470, { seed: i, eyes: i % 3 === 0 ? 'happy' : 'open' });
savePNG(new URL('../out/sheet.png', import.meta.url).pathname, s.w, s.h, s.d);
console.log('ok');
