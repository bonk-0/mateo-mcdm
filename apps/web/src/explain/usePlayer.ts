import type { PlayerAction, PlayerState, Timeline } from '@mateo/explain';
import { initialPlayerState, playerReducer } from '@mateo/explain';
import { useAnimationFrame } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Where the player is right now, readable and observable outside React. The stage follows
 * it frame by frame without re-rendering any component.
 */
export interface Playhead {
  get(): PlayerState;
  subscribe(listener: (state: PlayerState) => void): () => void;
}

export interface Player {
  /** State for rendering. `progress` is only current when something else changed too. */
  readonly state: PlayerState;
  readonly playhead: Playhead;
  readonly dispatch: (action: PlayerAction) => void;
}

/**
 * Runs the pure player of `@mateo/explain` on the animation clock. While a scene plays,
 * only the playhead moves; React renders again when the scene, the play state or a
 * setting changes.
 */
export function usePlayer(timeline: Timeline, animated: boolean): Player {
  const [state, setState] = useState(() => initialPlayerState(animated));
  const current = useRef(state);
  const listeners = useRef(new Set<(state: PlayerState) => void>());

  const playhead = useMemo<Playhead>(
    () => ({
      get: () => current.current,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [],
  );

  const dispatch = useCallback(
    (action: PlayerAction) => {
      const previous = current.current;
      const next = playerReducer(previous, action, timeline);
      if (next === previous) return;
      current.current = next;
      for (const listener of listeners.current) listener(next);
      const onlyProgress =
        action.type === 'tick' &&
        next.scene === previous.scene &&
        next.playing === previous.playing;
      if (!onlyProgress) setState(next);
    },
    [timeline],
  );

  useAnimationFrame((_time, delta) => {
    if (current.current.playing) dispatch({ type: 'tick', seconds: delta / 1000 });
  });

  useEffect(() => {
    dispatch({ type: 'animated', animated });
  }, [animated, dispatch]);

  // A new timeline (another analysis) starts from its first scene.
  const first = useRef(timeline);
  useEffect(() => {
    if (first.current === timeline) return;
    first.current = timeline;
    const fresh = initialPlayerState(current.current.animated);
    current.current = fresh;
    for (const listener of listeners.current) listener(fresh);
    setState(fresh);
  }, [timeline]);

  return { state, playhead, dispatch };
}
