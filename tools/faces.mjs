// Expression sheet for look-dev: every hero with brows/eyes/mouths, the new whale, Kimi, Qwen disguises.
import { Surface, gradV } from '../src/core/fb.mjs';
import { savePNG } from '../src/core/png.mjs';
import { text } from '../src/core/font.mjs';
import { drawClawd } from '../src/chars/clawd.mjs';
import { drawCodex } from '../src/chars/codex.mjs';
import { drawGemini } from '../src/chars/gemini.mjs';
import { drawQwen } from '../src/chars/qwen.mjs';
import { drawWhale, drawKimi } from '../src/chars/rivals.mjs';

const s = new Surface(960, 560);
gradV(s, 0, 0, 960, 560, [[0, '#2a2a40'], [1, '#3a3456']]);
const lab = (x, y, t) => text(s, t, x, y, { color: '#9a96b8', align: 'center' });
const CL = [
  ['norm', {}], ['angry', { brow: 'angry', eyes: 'determined', mouth: 'flat' }], ['worried', { brow: 'worried', eyes: 'open', mouth: 'wobble' }],
  ['sad', { brow: 'sad', eyes: 'sad', mouth: 'frown' }], ['cry', { brow: 'sad', eyes: 'teary', mouth: 'sob', tears: 1 }], ['shock', { brow: 'raised', eyes: 'shock', mouth: 'gasp' }],
  ['love', { eyes: 'heart', mouth: 'big', blush: 2 }], ['sus', { eyes: 'sus', mouth: 'flat', brow: 'focus' }], ['tongue', { eyes: 'happy', mouth: 'tongue' }],
  ['dizzy', { eyes: 'spiral', mouth: 'wobble' }], ['spark', { eyes: 'sparkle', mouth: 'open' }], ['half', { eyes: 'half', mouth: 'smallSmile' }],
];
CL.forEach(([n, p], i) => { drawClawd(s, 40 + i * 76, 74, p); lab(40 + i * 76, 80, n); });
CL.forEach(([n, p], i) => { drawGemini(s, 40 + i * 76, 170, { ...p, tears: p.tears }); });
CL.forEach(([n, p], i) => { drawQwen(s, 40 + i * 76, 262, { ...p }); });
const DQ = [['groucho', ['nose', 'mustache']], ['tophat', ['tophat', 'mustache', 'monocle']], ['beret', ['beret', 'mustache']], ['cap', ['cap', 'beard']], ['beard', ['beard']]];
DQ.forEach(([n, d], i) => { drawQwen(s, 50 + i * 80, 380, { disguise: d, glasses: n === 'groucho' || n === 'beard', mouth: 'smirk' }); lab(50 + i * 80, 386, n); });
drawWhale(s, 560, 380, { spout: 1, spoutPh: 1 });
drawWhale(s, 690, 380, { eyes: 'laugh', mouth: 'laugh', tail: 1, brow: 'raised' });
drawWhale(s, 820, 380, { eyes: 'shock', mouth: 'o', brow: 'raised', fin: 1, flip: true });
drawKimi(s, 60, 480, {}); drawKimi(s, 130, 480, { eyes: 'laugh', mouth: 'big' }); drawKimi(s, 200, 480, { eyes: 'shock', mouth: 'o', brow: 'raised' });
const CX = [['happy'], ['wide'], ['angry'], ['sad'], ['heart'], ['smug'], ['wink'], ['eyes']];
CX.forEach(([f], i) => drawCodex(s, 290 + i * 74, 500, { screen: { mode: 'face', face: f } }));
savePNG('out/faces.png', s.w, s.h, s.d);
console.log('ok');
