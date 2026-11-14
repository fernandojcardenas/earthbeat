export const SOURCES = [
  {
    title: 'Lightning Events Detected from the International Space Station (ISS) 2017–2023 (SVS 5011)',
    url: 'https://svs.gsfc.nasa.gov/5011/',
    note: 'source visualization; 1920×1080 MP4 used as input',
  },
  {
    title: 'Earth Information Center content gallery',
    url: 'https://svs.gsfc.nasa.gov/gallery/earth-information-center/',
    note: 'NASA collection the visualization belongs to',
  },
  {
    title: 'The Earth Information Jukebox — 2026 NASA Space Apps Challenge',
    url: 'https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/',
    note: 'challenge statement',
  },
  {
    title: 'NASA images and media usage guidelines',
    url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    note: 'terms for using NASA media',
  },
  {
    title: 'Web Content Accessibility Guidelines (WCAG) 2.2',
    url: 'https://www.w3.org/TR/WCAG22/',
    note: 'accessibility reference',
  },
  {
    title: 'Web Audio API',
    url: 'https://www.w3.org/TR/webaudio/',
    note: 'browser sound-synthesis standard',
  },
] as const;

/** Packages shipped in the production bundle. Development tools are listed in SOURCES.md. */
export const DEPENDENCIES = [
  { name: 'React 19', license: 'MIT' },
  { name: 'React DOM 19', license: 'MIT' },
  { name: 'scheduler (React runtime dependency)', license: 'MIT' },
] as const;
