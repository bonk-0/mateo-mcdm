import { describe, expect, it } from 'vitest';
import type { PlayerAction, PlayerState } from './player';
import {
  SECONDS_PER_BEAT,
  atEnd,
  initialPlayerState,
  playerPosition,
  playerReducer,
  spanProgress,
} from './player';
import { marcosSequence } from './sequences';
import { marcosRun } from './testing/runs';
import { buildTimeline } from './timeline';
import type { Timeline } from './types';

const timeline = buildTimeline(marcosRun().trace, marcosSequence);
const last = timeline.scenes.length - 1;
const secondsOf = (scene: number) => timeline.scenes[scene]!.beats * SECONDS_PER_BEAT;

function run(state: PlayerState, ...actions: PlayerAction[]): PlayerState {
  return actions.reduce((current, action) => playerReducer(current, action, timeline), state);
}
const at = (state: PlayerState) => [state.scene, state.progress, state.playing];

describe('the animated player', () => {
  const start = initialPlayerState(true);

  it('starts paused before the first scene', () => {
    expect(start).toMatchObject({ scene: 0, progress: 0, playing: false, speed: 1 });
    expect(playerPosition(start)).toBe(0);
  });

  it('plays through scenes and stops at the end', () => {
    let state = run(start, { type: 'play' }, { type: 'tick', seconds: secondsOf(0) / 2 });
    expect(state.scene).toBe(0);
    expect(state.progress).toBeCloseTo(0.5);
    expect(state.playing).toBe(true);
    // A tick that is longer than the rest of the scene carries over into the next one.
    state = run(state, { type: 'tick', seconds: secondsOf(0) / 2 + secondsOf(1) / 4 });
    expect(state.scene).toBe(1);
    expect(state.progress).toBeCloseTo(0.25);
    state = run(state, { type: 'tick', seconds: 10_000 });
    expect(at(state)).toEqual([last, 1, false]);
    expect(atEnd(state, timeline)).toBe(true);
    // Playing again from the end restarts.
    expect(at(run(state, { type: 'play' }))).toEqual([0, 0, true]);
  });

  it('does not move while paused, and ignores non-positive ticks', () => {
    expect(run(start, { type: 'tick', seconds: 5 })).toBe(start);
    const playing = run(start, { type: 'play' });
    expect(run(playing, { type: 'tick', seconds: 0 })).toBe(playing);
    expect(run(playing, { type: 'tick', seconds: Number.NaN })).toBe(playing);
    expect(run(playing, { type: 'pause' }).playing).toBe(false);
    expect(run(start, { type: 'pause' })).toBe(start);
    expect(run(start, { type: 'toggle' }).playing).toBe(true);
    expect(run(start, { type: 'toggle' }, { type: 'toggle' }).playing).toBe(false);
  });

  it('follows the speed', () => {
    const state = run(
      start,
      { type: 'speed', speed: 2 },
      { type: 'play' },
      { type: 'tick', seconds: secondsOf(0) / 4 },
    );
    expect(state.progress).toBeCloseTo(0.5);
    expect(run(state, { type: 'speed', speed: 0 }).speed).toBe(2);
  });

  it('steps forward: completes the scene, then plays the next one once', () => {
    let state = run(start, { type: 'step-forward' });
    expect(at(state)).toEqual([0, 1, false]);
    state = run(state, { type: 'step-forward' });
    expect(at(state)).toEqual([1, 0, true]);
    expect(state.once).toBe(true);
    state = run(state, { type: 'tick', seconds: 10_000 });
    expect(at(state)).toEqual([1, 1, false]);
    // Play after a completed scene continues with the next one.
    expect(at(run(state, { type: 'play' }))).toEqual([2, 0, true]);
    const end = run(state, { type: 'last' });
    expect(run(end, { type: 'step-forward' })).toBe(end);
  });

  it('steps back: to the start of the scene, then to the complete previous scene', () => {
    const middle = run(start, { type: 'seek', position: 2.4 });
    expect(middle.scene).toBe(2);
    expect(middle.progress).toBeCloseTo(0.4);
    let state = run(middle, { type: 'step-back' });
    expect(at(state)).toEqual([2, 0, false]);
    state = run(state, { type: 'step-back' });
    expect(at(state)).toEqual([1, 1, false]);
    state = run(state, { type: 'step-back' });
    expect(at(state)).toEqual([0, 1, false]);
    state = run(state, { type: 'step-back' });
    expect(at(state)).toEqual([0, 0, false]);
    expect(run(state, { type: 'step-back' })).toBe(state);
  });

  it('seeks, jumps and goes to both ends', () => {
    expect(at(run(start, { type: 'seek', position: -3 }))).toEqual([0, 0, false]);
    expect(at(run(start, { type: 'seek', position: 999 }))).toEqual([last, 1, false]);
    expect(at(run(start, { type: 'seek', position: 3 }))).toEqual([3, 0, false]);
    expect(at(run(start, { type: 'jump', scene: 4 }))).toEqual([4, 0, true]);
    expect(at(run(start, { type: 'jump', scene: 999 }))).toEqual([last, 0, true]);
    expect(at(run(start, { type: 'last' }))).toEqual([last, 1, false]);
    expect(at(run(start, { type: 'last' }, { type: 'first' }))).toEqual([0, 0, false]);
    expect(at(run(start, { type: 'play' }, { type: 'show', scene: 6 }))).toEqual([6, 1, false]);
    expect(at(run(start, { type: 'show', scene: -4 }))).toEqual([0, 1, false]);
  });

  it('is deterministic', () => {
    const actions: PlayerAction[] = [
      { type: 'play' },
      { type: 'tick', seconds: 1.3 },
      { type: 'speed', speed: 1.5 },
      { type: 'tick', seconds: 2.7 },
      { type: 'step-forward' },
    ];
    expect(run(start, ...actions)).toEqual(run(start, ...actions));
  });
});

describe('static steps (reduced motion)', () => {
  const start = initialPlayerState(false);

  it('shows every scene complete and never plays', () => {
    expect(at(start)).toEqual([0, 1, false]);
    expect(run(start, { type: 'play' })).toBe(start);
    expect(at(run(start, { type: 'step-forward' }))).toEqual([1, 1, false]);
    expect(at(run(start, { type: 'jump', scene: 5 }))).toEqual([5, 1, false]);
    expect(at(run(start, { type: 'seek', position: 3.2 }))).toEqual([3, 1, false]);
    expect(at(run(start, { type: 'jump', scene: 5 }, { type: 'step-back' }))).toEqual([
      4,
      1,
      false,
    ]);
    expect(at(run(start, { type: 'last' }, { type: 'first' }))).toEqual([0, 1, false]);
    expect(run(start, { type: 'step-back' })).toBe(start);
  });

  it('switching animation off completes the scene and stops', () => {
    const playing = run(initialPlayerState(true), { type: 'play' }, { type: 'tick', seconds: 0.2 });
    const still = run(playing, { type: 'animated', animated: false });
    expect(still).toMatchObject({ animated: false, progress: 1, playing: false });
    expect(run(still, { type: 'animated', animated: false })).toBe(still);
    expect(run(still, { type: 'animated', animated: true }).animated).toBe(true);
  });
});

describe('edge cases', () => {
  it('an empty timeline never changes the state', () => {
    const empty: Timeline = { methodId: 'x', methodVersion: '1', scenes: [], steps: [] };
    const state = initialPlayerState(true);
    expect(playerReducer(state, { type: 'play' }, empty)).toBe(state);
  });

  it('spanProgress maps scene progress to the progress of one span', () => {
    const span = { start: 0.2, end: 0.6 };
    expect(spanProgress(span, 0)).toBe(0);
    expect(spanProgress(span, 0.2)).toBe(0);
    expect(spanProgress(span, 0.4)).toBeCloseTo(0.5);
    expect(spanProgress(span, 0.6)).toBe(1);
    expect(spanProgress(span, 1)).toBe(1);
  });
});
