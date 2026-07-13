export type OrbitIntroPhase = "boot" | "core" | "orbit" | "nodes" | "title" | "settled";

export interface OrbitIntroFrame {
  elapsed: number;
  progress: number;
  background: number;
  core: number;
  orbit: number;
  nodes: number;
  title: number;
  interface: number;
  phase: OrbitIntroPhase;
}

interface OrbitIntroOptions {
  root: HTMLElement;
  mobile: boolean;
  reducedMotion: boolean;
  onFinish?: (reason: string) => void;
}

const STORAGE_KEY = "aloftvox-orbit-intro-seen-v2";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const range = (elapsed: number, start: number, end: number) => clamp((elapsed - start) / Math.max(1, end - start));

export function createOrbitIntro({ root, mobile, reducedMotion, onFinish }: OrbitIntroOptions) {
  const duration = mobile ? 1300 : 2700;
  let startTime = performance.now();
  let finished = false;
  let finishReason = "pending";

  const hasPlayed = (() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  })();

  const setPhase = (phase: OrbitIntroPhase) => {
    root.dataset.introState = phase;
  };

  const finishIntro = (reason: string) => {
    if (finished) return;
    finished = true;
    finishReason = reason;
    setPhase("settled");
    root.toggleAttribute("data-intro-running", false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // The intro still completes when storage is unavailable.
    }
    onFinish?.(reason);
    window.dispatchEvent(new CustomEvent("aloftvox:orbit-intro-complete", { detail: { reason } }));
  };

  const start = (force = false) => {
    finished = false;
    finishReason = "pending";
    startTime = performance.now();
    root.toggleAttribute("data-intro-running", true);
    setPhase("boot");

    if (reducedMotion) {
      finishIntro("reduced-motion");
      return;
    }

    if (hasPlayed && !force) {
      finishIntro("session");
    }
  };

  const replay = () => start(true);
  const skip = () => finishIntro("skipped");

  const update = (now: number): OrbitIntroFrame => {
    const elapsed = finished ? duration : Math.min(now - startTime, duration);
    const background = range(elapsed, 0, mobile ? 150 : 350);
    const core = range(elapsed, mobile ? 120 : 350, mobile ? 460 : 850);
    const orbit = range(elapsed, mobile ? 280 : 700, mobile ? 900 : 1550);
    const nodes = range(elapsed, mobile ? 420 : 1000, mobile ? 1080 : 1900);
    const title = range(elapsed, mobile ? 520 : 1250, mobile ? 1120 : 2250);
    const interfaceProgress = range(elapsed, mobile ? 900 : 2050, duration);

    let phase: OrbitIntroPhase = "boot";
    if (elapsed >= (mobile ? 120 : 350)) phase = "core";
    if (elapsed >= (mobile ? 280 : 700)) phase = "orbit";
    if (elapsed >= (mobile ? 420 : 1000)) phase = "nodes";
    if (elapsed >= (mobile ? 520 : 1250)) phase = "title";
    if (finished || elapsed >= duration) phase = "settled";

    if (!finished) {
      setPhase(phase);
      if (elapsed >= duration) finishIntro("completed");
    }

    return {
      elapsed,
      progress: clamp(elapsed / duration),
      background,
      core,
      orbit,
      nodes,
      title,
      interface: interfaceProgress,
      phase,
    };
  };

  window.setTimeout(() => finishIntro("fail-open"), 3200);

  return {
    duration,
    start,
    update,
    replay,
    skip,
    finishIntro,
    isFinished: () => finished,
    finishReason: () => finishReason,
  };
}
