import { LANDING_COPY } from '../copy';

export type StallCrowdLevel = 'quiet' | 'steady' | 'busy' | 'hot';

export type StallCrowdSignal = {
  count: number;
  level: StallCrowdLevel;
  phrase: string;
  label: string;
  dots: number;
};

const { stallVoice } = LANDING_COPY.vendors;

function resolveStallLevel(count: number, isHot: boolean): StallCrowdLevel {
  if (isHot && count >= 4) return 'hot';
  if (count >= 7) return 'hot';
  if (count >= 4) return 'busy';
  if (count >= 2) return 'steady';
  return 'quiet';
}

function resolveDots(level: StallCrowdLevel): number {
  switch (level) {
    case 'quiet':
      return 1;
    case 'steady':
      return 2;
    case 'busy':
      return 3;
    case 'hot':
      return 3;
  }
}

function resolveStallPhrase(name: string, level: StallCrowdLevel): string {
  const voices = stallVoice as Record<string, Record<StallCrowdLevel, string>>;
  const voice = voices[name] ?? voices.default;
  return voice[level];
}

function resolveStallLabel(count: number, phrase: string): string {
  return `${count} ${phrase}`;
}

export function buildStallCrowdSignal(name: string, count: number, isHot: boolean): StallCrowdSignal {
  const level = resolveStallLevel(count, isHot);
  const phrase = resolveStallPhrase(name, level);

  return {
    count,
    level,
    phrase,
    label: resolveStallLabel(count, phrase),
    dots: resolveDots(level),
  };
}
