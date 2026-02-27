import { createSignal, onCleanup } from 'solid-js';

export function useTimer() {
  const [seconds, setSeconds] = createSignal(0);
  let interval: ReturnType<typeof setInterval> | null = null;

  function start() {
    stop();
    setSeconds(0);
    interval = setInterval(() => setSeconds(s => s + 1), 1000);
  }

  function stop(): number {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
    return seconds();
  }

  function reset() {
    stop();
    setSeconds(0);
  }

  onCleanup(() => { if (interval !== null) clearInterval(interval); });

  return { seconds, start, stop, reset };
}
