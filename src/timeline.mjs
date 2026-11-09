// Scene order and durations (sum = 240 s). Scene modules export default {render, in?, out?}, SFX and MUSIC (scene-local times).
import * as opening from './scenes/v2_01_opening.mjs';
import * as intro from './scenes/v2_02_intro.mjs';
import * as race from './scenes/v2_03_race.mjs';
import * as falling from './scenes/v2_04_falling.mjs';
import * as overtaken from './scenes/v2_05_overtaken.mjs';
import * as rain from './scenes/v2_06_rain.mjs';
import * as friend from './scenes/v2_07_friend.mjs';
import * as build from './scenes/v2_08_build.mjs';
import * as argon from './scenes/v2_09_argon.mjs';
import * as together from './scenes/v2_10_together.mjs';
import * as stand from './scenes/v2_11_stand.mjs';
import * as ambush from './scenes/v2_12_ambush.mjs';
import * as finale from './scenes/v2_13_finale.mjs';
import * as credits from './scenes/v2_14_credits.mjs';
import * as carbon from './scenes/v2_15_carbon.mjs';

const ORDER = [
  ['opening', 15, opening],
  ['intro', 17, intro],
  ['race', 21, race],
  ['falling', 21, falling],
  ['overtaken', 22, overtaken],
  ['rain', 16, rain],
  ['friend', 19, friend],
  ['build', 11, build],
  ['argon', 19, argon],
  ['together', 14, together],
  ['stand', 14, stand],
  ['ambush', 17, ambush],
  ['finale', 14, finale],
  ['credits', 11, credits],
  ['carbon', 9, carbon],
];

export const SCENES = ORDER.map(([id, dur, m]) => ({ ...m.default, id, dur, sfx: m.SFX || [], music: m.MUSIC || [] }));
