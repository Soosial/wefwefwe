// Scene order and durations (sum = 180 s). Scene modules export default {render, in?, out?, xfade?} and SFX.
import * as prologue from './scenes/s01_prologue.mjs';
import * as title from './scenes/s02_title.mjs';
import * as festival from './scenes/s03_festival.mjs';
import * as months from './scenes/s04_months.mjs';
import * as mockery from './scenes/s05_mockery.mjs';
import * as rain from './scenes/s06_rain.mjs';
import * as spy from './scenes/s07_spy.mjs';
import * as friends from './scenes/s08_friends.mjs';
import * as comeback from './scenes/s09_comeback.mjs';
import * as together from './scenes/s10_together.mjs';
import * as ambush from './scenes/s11_ambush.mjs';
import * as finale from './scenes/s12_finale.mjs';
import * as credits from './scenes/s13_credits.mjs';
import { text } from './core/font.mjs';

function placeholder(id) {
  return {
    default: {
      render(f, t) {
        const s = f.camera(240, 135, 1);
        s.d.fill(0xff201830);
        text(f.ui, id + '  ' + t.toFixed(1), 240, 130, { align: 'center', color: '#ffffff' });
      },
    },
    SFX: [],
  };
}

const ORDER = [
  ['prologue', 13, prologue],
  ['title', 5, title],
  ['festival', 20, festival],
  ['geminiTurn', 14, months],
  ['mockery', 15, mockery],
  ['rain', 13, rain],
  ['spy', 13, spy],
  ['friends', 19, friends],
  ['comeback', 18, comeback],
  ['together', 13, together],
  ['ambush', 19, ambush],
  ['finale', 11, finale],
  ['credits', 7, credits],
];

export const SCENES = ORDER.map(([id, dur, mod]) => {
  const m = mod || placeholder(id);
  return { ...m.default, id, dur, sfx: m.SFX || [] };
});
