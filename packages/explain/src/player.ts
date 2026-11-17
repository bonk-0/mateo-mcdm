import type { Timeline } from './types';

/** Playback speeds the player offers. */
export const PLAYER_SPEEDS = [0.5, 1, 1.5, 2, 3] as const;

/** Seconds one beat of a scene takes at speed 1. */
export const SECONDS_PER_BEAT = 2.2;

/**
 * Where the player is. `scene` is an index into `Timeline.scenes` and `progress` runs
 * from 0 (nothing of the scene shown yet) to 1 (the scene is complete).
 */
export interface PlayerState {
  readonly scene: number;
  readonly progress: number;
  readonly playing: boolean;
  /** Stop at the end of the current scene instead of going on to the next one. */
  readonly once: boolean;
  readonly speed: number;
  /**
   * False in static-steps mode (reduced motion): nothing moves, every scene is shown
   * complete and the player only steps from scene to scene.
   */
  readonly animated: boolean;
}

export type PlayerAction =
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'toggle' }
  /** Completes the current scene, or plays the next one and stops at its end. */
  | { readonly type: 'step-forward' }
  /** Back to the start of the current scene, or to the complete previous scene. */
  | { readonly type: 'step-back' }
  | { readonly type: 'first' }
  | { readonly type: 'last' }
  /** Plays one scene from its start (shows it complete in static mode). */
  | { readonly type: 'jump'; readonly scene: number }
  /** Shows one scene complete, without playing it. */
  | { readonly type: 'show'; readonly scene: number }
  /** Moves to a position on the scrub bar: `scene + progress`, from 0 to the scene count. */
  | { readonly type: 'seek'; readonly position: number }
  | { readonly type: 'speed'; readonly speed: number }
  | { readonly type: 'animated'; readonly animated: boolean }
  /** Time passed since the last tick, in seconds. */
  | { readonly type: 'tick'; readonly seconds: number };

export function initialPlayerState(animated: boolean): PlayerState {
  return { scene: 0, progress: animated ? 0 : 1, playing: false, once: false, speed: 1, animated };
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** The position on the scrub bar: `scene + progress`. */
export function playerPosition(state: PlayerState): number {
  return state.scene + state.progress;
}

/** True when the last scene is complete. */
export function atEnd(state: PlayerState, timeline: Timeline): boolean {
  return state.scene >= timeline.scenes.length - 1 && state.progress >= 1;
}

function land(state: PlayerState, scene: number, last: number): PlayerState {
  const target = clamp(Math.trunc(scene), 0, last);
  return state.animated
    ? { ...state, scene: target, progress: 0, playing: true, once: true }
    : { ...state, scene: target, progress: 1, playing: false, once: false };
}

function tick(state: PlayerState, seconds: number, timeline: Timeline): PlayerState {
  if (!state.playing || !(seconds > 0)) return state;
  const last = timeline.scenes.length - 1;
  let { scene, progress } = state;
  let remaining = seconds * state.speed;
  // A long frame can cross several short scenes.
  for (;;) {
    const length = Math.max(0.05, (timeline.scenes[scene]?.beats ?? 1) * SECONDS_PER_BEAT);
    const left = (1 - progress) * length;
    if (remaining < left) return { ...state, scene, progress: progress + remaining / length };
    if (state.once || scene >= last) {
      return { ...state, scene, progress: 1, playing: false, once: false };
    }
    remaining -= left;
    scene += 1;
    progress = 0;
  }
}

/**
 * The player as a pure state machine: the same state and action always give the same next
 * state. The user interface owns the clock and sends `tick` actions.
 */
export function playerReducer(
  state: PlayerState,
  action: PlayerAction,
  timeline: Timeline,
): PlayerState {
  const last = timeline.scenes.length - 1;
  if (last < 0) return state;
  switch (action.type) {
    case 'play': {
      if (!state.animated) return state;
      if (atEnd(state, timeline)) {
        return { ...state, scene: 0, progress: 0, playing: true, once: false };
      }
      if (state.progress >= 1) {
        return { ...state, scene: state.scene + 1, progress: 0, playing: true, once: false };
      }
      return { ...state, playing: true, once: false };
    }
    case 'pause':
      return state.playing ? { ...state, playing: false, once: false } : state;
    case 'toggle':
      return playerReducer(state, { type: state.playing ? 'pause' : 'play' }, timeline);
    case 'step-forward': {
      if (state.progress < 1) return { ...state, progress: 1, playing: false, once: false };
      return state.scene >= last ? state : land(state, state.scene + 1, last);
    }
    case 'step-back': {
      if (state.animated && state.progress > 0 && (state.progress < 1 || state.scene === 0)) {
        return { ...state, progress: 0, playing: false, once: false };
      }
      if (state.scene === 0) return state;
      return { ...state, scene: state.scene - 1, progress: 1, playing: false, once: false };
    }
    case 'first':
      return { ...state, scene: 0, progress: state.animated ? 0 : 1, playing: false, once: false };
    case 'last':
      return { ...state, scene: last, progress: 1, playing: false, once: false };
    case 'jump':
      return land(state, action.scene, last);
    case 'show':
      return {
        ...state,
        scene: clamp(Math.trunc(action.scene), 0, last),
        progress: 1,
        playing: false,
        once: false,
      };
    case 'seek': {
      const position = clamp(action.position, 0, last + 1);
      const scene = Math.min(last, Math.floor(position));
      const progress = state.animated ? clamp(position - scene, 0, 1) : 1;
      return { ...state, scene, progress, playing: false, once: false };
    }
    case 'speed':
      return action.speed > 0 ? { ...state, speed: action.speed } : state;
    case 'animated':
      if (action.animated === state.animated) return state;
      return action.animated
        ? { ...state, animated: true }
        : { ...state, animated: false, progress: 1, playing: false, once: false };
    case 'tick':
      return tick(state, action.seconds, timeline);
  }
}

/** Progress of a span at a scene progress: 0 before it starts, 1 after it ends. */
export function spanProgress(span: { start: number; end: number }, progress: number): number {
  if (progress >= span.end) return 1;
  if (progress <= span.start) return 0;
  return (progress - span.start) / (span.end - span.start);
}
