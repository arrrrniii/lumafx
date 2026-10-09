/**
 * lumafx/ui schema: the blocks an AI (or your backend) can send, defined once.
 *
 * From these definitions come the validator (coerces and cleans what a model wrote), the JSON
 * Schema for tool calling and structured output, and a compact reference for system prompts.
 * No DOM here, so it runs in route handlers, MCP servers and the browser alike.
 */

/* ------------------------------------------------------------------ type DSL */

export type Kind = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'array' | 'object' | 'block' | 'cell';
export type Format = 'url' | 'image' | 'date' | 'color' | 'markdown';

export interface T {
  kind: Kind;
  desc?: string;
  optional?: boolean;
  values?: readonly string[];
  of?: T;
  props?: Record<string, T>;
  format?: Format;
  min?: number;
  max?: number;
  /** For arrays: [a, b] pairs and other fixed-length lists. */
  length?: number;
}

const t = (kind: Kind, extra: Partial<T> = {}): T => ({ kind, ...extra });
export const S = {
  str: (desc?: string) => t('string', { desc }),
  md: (desc?: string) => t('string', { desc, format: 'markdown' }),
  url: (desc?: string) => t('string', { desc, format: 'url' }),
  img: (desc?: string) => t('string', { desc, format: 'image' }),
  date: (desc?: string) => t('string', { desc, format: 'date' }),
  color: (desc?: string) => t('string', { desc, format: 'color' }),
  num: (desc?: string, min?: number, max?: number) => t('number', { desc, min, max }),
  int: (desc?: string, min?: number, max?: number) => t('integer', { desc, min, max }),
  bool: (desc?: string) => t('boolean', { desc }),
  en: (values: readonly string[], desc?: string) => t('enum', { values, desc }),
  arr: (of: T, desc?: string) => t('array', { of, desc }),
  pair: (of: T, desc?: string) => t('array', { of, desc, length: 2 }),
  obj: (props: Record<string, T>, desc?: string) => t('object', { props, desc }),
  /** A string or a number: table cells, stat values. */
  cell: (desc?: string) => t('cell', { desc }),
  blocks: (desc?: string) => t('array', { of: t('block'), desc }),
};
/** Marks a type optional. */
export const opt = (x: T): T => ({ ...x, optional: true });

/* ------------------------------------------------------------------ shared shapes */

const Team = S.obj({
  name: S.str('Full name.'),
  short: opt(S.str('Short code, e.g. ALB.')),
  logo: opt(S.img('Crest or logo URL.')),
  color: opt(S.color('Main team color.')),
  rank: opt(S.int('Ranking or seed.')),
  form: opt(S.str('Recent results, newest last, e.g. "WWDLW".')),
});
const Kit = S.obj({
  shirt: opt(S.color()),
  sleeves: opt(S.color()),
  number: opt(S.color('Number color.')),
});
const Side = S.en(['home', 'away']);
const Link = S.obj({ label: S.str(), url: S.url() });

/* ------------------------------------------------------------------ blocks */

export interface BlockDef {
  type: string;
  group: 'content' | 'data' | 'sport' | 'event';
  desc: string;
  props: Record<string, T>;
  example: Record<string, unknown>;
}

/** Props every block accepts. */
export const COMMON: Record<string, T> = {
  id: opt(S.str('Stable id, for live updates.')),
  title: opt(S.str('Heading shown above the block.')),
  note: opt(S.md('Small print under the block.')),
  live: opt(S.obj({ adapter: S.str(), id: S.str(), every: opt(S.int('Seconds between refreshes.', 5)) }, 'Keep the block updated through a registered data adapter.')),
};

const B = (type: string, group: BlockDef['group'], desc: string, props: Record<string, T>, example: Record<string, unknown>): BlockDef => ({ type, group, desc, props, example });

export const BLOCKS: BlockDef[] = [
  /* -------- content -------- */
  B('text', 'content', 'Paragraphs of markdown: **bold**, *italic*, `code`, [links](https://…), "- " lists.', { md: S.md() }, { type: 'text', md: 'Kickoff is at **20:45** at Air Albania Stadium.' }),
  B('callout', 'content', 'A highlighted message.', { tone: opt(S.en(['info', 'success', 'warning', 'danger', 'tip'])), text: S.md() }, { type: 'callout', tone: 'warning', text: 'Gates open 90 minutes before kickoff.' }),
  B('group', 'content', 'Lays out other blocks in a stack, a row or a grid.', { layout: opt(S.en(['stack', 'row', 'grid'])), columns: opt(S.int(undefined, 1, 4)), blocks: S.blocks() }, { type: 'group', layout: 'grid', columns: 2, blocks: [] }),
  B('tabs', 'content', 'Tabs, each holding blocks.', { tabs: S.arr(S.obj({ label: S.str(), blocks: S.blocks() })) }, { type: 'tabs', tabs: [{ label: 'Preview', blocks: [] }] }),
  B('faq', 'content', 'Questions that expand to answers.', { items: S.arr(S.obj({ q: S.str(), a: S.md() })) }, { type: 'faq', items: [{ q: 'Is the lineup confirmed?', a: 'Yes, all eleven.' }] }),
  B('details', 'content', 'Label and value pairs, such as match or event facts.', { items: S.arr(S.obj({ label: S.str(), value: S.str(), icon: opt(S.str('One emoji.')), url: opt(S.url()) })) }, { type: 'details', items: [{ label: 'Stadium', value: 'Air Albania, Tirana', icon: '🏟' }] }),
  B('table', 'data', 'A table. Rows are arrays of cells in column order.', {
    columns: S.arr(S.obj({ label: S.str(), align: opt(S.en(['left', 'center', 'right'])), format: opt(S.en(['text', 'number', 'percent', 'money', 'date'])) })),
    rows: S.arr(S.arr(S.cell())),
    highlight: opt(S.int('Row index to highlight.')),
    currency: opt(S.str('ISO code for money columns.')),
  }, { type: 'table', columns: [{ label: 'Team' }, { label: 'Points', align: 'right' }], rows: [['Team A', 12]] }),
  B('stats', 'data', 'Headline numbers.', {
    items: S.arr(S.obj({ label: S.str(), value: S.cell(), unit: opt(S.str()), delta: opt(S.num('Change in % vs. the previous period.')), period: opt(S.str('What the delta compares to.')), good: opt(S.en(['up', 'down'], 'Which direction is good.')), trend: opt(S.arr(S.num())) })),
  }, { type: 'stats', items: [{ label: 'Tickets sold', value: 18420, delta: 12, period: 'vs. last match' }] }),
  B('chart', 'data', 'A chart: line, area, bar (horizontal), column, stacked or donut. One axis only.', {
    kind: S.en(['line', 'area', 'column', 'bar', 'stacked', 'donut']),
    labels: S.arr(S.str(), 'X-axis categories (or donut slice names).'),
    series: S.arr(S.obj({ name: S.str(), values: S.arr(S.num()) })),
    unit: opt(S.str()),
    min: opt(S.num()),
    max: opt(S.num()),
  }, { type: 'chart', kind: 'line', labels: ['Mar', 'Jun', 'Sep'], series: [{ name: 'Goals', values: [3, 5, 4] }] }),
  B('steps', 'content', 'Numbered steps.', { items: S.arr(S.obj({ title: S.str(), text: opt(S.md()) })) }, { type: 'steps', items: [{ title: 'Open eBileta', text: 'Choose the match.' }] }),
  B('timeline', 'content', 'Events in time order.', { items: S.arr(S.obj({ time: S.str(), title: S.str(), text: opt(S.md()), icon: opt(S.str('One emoji.')) })) }, { type: 'timeline', items: [{ time: '18:00', title: 'Gates open' }] }),
  B('compare', 'data', 'Options side by side on the same attributes.', {
    items: S.arr(S.obj({ name: S.str(), image: opt(S.img()), price: opt(S.str()), badge: opt(S.str()), url: opt(S.url()), values: S.obj({}, 'Attribute → value.') })),
    attributes: opt(S.arr(S.str(), 'Row order.')),
  }, { type: 'compare', items: [{ name: 'Standard', price: '€15', values: { View: 'Behind the goal' } }] }),
  B('product', 'content', 'One product or offer.', { name: S.str(), image: opt(S.img()), price: opt(S.num()), oldPrice: opt(S.num()), currency: opt(S.str()), rating: opt(S.num(undefined, 0, 5)), reviews: opt(S.int()), badge: opt(S.str()), text: opt(S.md()), url: opt(S.url()), cta: opt(S.str()) }, { type: 'product', name: 'Home shirt 2026', price: 75, currency: 'EUR' }),
  B('gallery', 'content', 'Images in a grid.', { images: S.arr(S.obj({ src: S.img(), alt: S.str(), caption: opt(S.str()) })) }, { type: 'gallery', images: [{ src: 'https://…/1.jpg', alt: 'Training' }] }),
  B('image', 'content', 'One image with a caption.', { src: S.img(), alt: S.str(), caption: opt(S.str()) }, { type: 'image', src: 'https://…/hero.jpg', alt: 'The team before training' }),
  B('quote', 'content', 'A quote.', { text: S.str(), author: opt(S.str()), role: opt(S.str()), image: opt(S.img()) }, { type: 'quote', text: 'We want to start fast.', author: 'Head coach', role: 'Press conference' }),
  B('progress', 'data', 'Progress bars.', { items: S.arr(S.obj({ label: S.str(), value: S.num(), max: opt(S.num()), tone: opt(S.en(['accent', 'good', 'warning', 'critical'])) })) }, { type: 'progress', items: [{ label: 'Sold', value: 82, max: 100 }] }),
  B('weather', 'data', 'Current weather and a forecast.', {
    location: S.str(),
    units: opt(S.en(['c', 'f'])),
    now: S.obj({ temp: S.num(), condition: S.str(), icon: opt(S.en(['sun', 'partly', 'cloud', 'rain', 'storm', 'snow', 'fog', 'wind', 'night'])), feels: opt(S.num()), humidity: opt(S.num()), wind: opt(S.str()) }),
    hours: opt(S.arr(S.obj({ time: S.str(), temp: S.num(), icon: opt(S.en(['sun', 'partly', 'cloud', 'rain', 'storm', 'snow', 'fog', 'wind', 'night'])), rain: opt(S.num('Chance of rain, %.')) }))),
    days: opt(S.arr(S.obj({ day: S.str(), hi: S.num(), lo: S.num(), icon: opt(S.en(['sun', 'partly', 'cloud', 'rain', 'storm', 'snow', 'fog', 'wind', 'night'])), rain: opt(S.num('Chance of rain, %.')) }))),
  }, { type: 'weather', location: 'Tirana', now: { temp: 21, condition: 'Clear', icon: 'sun' } }),
  B('places', 'content', 'A list of places with ratings and map links.', {
    items: S.arr(S.obj({ name: S.str(), category: opt(S.str()), address: opt(S.str()), rating: opt(S.num(undefined, 0, 5)), price: opt(S.str('e.g. €€')), image: opt(S.img()), url: opt(S.url()), lat: opt(S.num()), lng: opt(S.num()), note: opt(S.str()) })),
  }, { type: 'places', items: [{ name: 'Mullixhiu', category: 'Restaurant', rating: 4.7 }] }),
  B('itinerary', 'content', 'A plan by day.', { days: S.arr(S.obj({ label: S.str(), stops: S.arr(S.obj({ time: opt(S.str()), name: S.str(), note: opt(S.str()), url: opt(S.url()) })) })) }, { type: 'itinerary', days: [{ label: 'Saturday', stops: [{ time: '10:00', name: 'Skanderbeg Square' }] }] }),
  B('quiz', 'content', 'Multiple-choice questions with feedback.', { questions: S.arr(S.obj({ q: S.str(), options: S.arr(S.str()), answer: S.int('Index of the correct option.'), explain: opt(S.md()) })) }, { type: 'quiz', questions: [{ q: 'How long is a football match?', options: ['80 minutes', '90 minutes'], answer: 1 }] }),
  B('actions', 'content', 'Buttons that link somewhere.', { buttons: S.arr(S.obj({ label: S.str(), url: S.url(), style: opt(S.en(['primary', 'secondary', 'ghost'])) })) }, { type: 'actions', buttons: [{ label: 'Buy tickets', url: 'https://…', style: 'primary' }] }),
  B('suggestions', 'content', 'Follow-up questions the reader can ask next (chips). Clicking one asks it in chat; with a url it is a link.', { items: S.arr(S.obj({ text: S.str(), url: opt(S.url()) })) }, { type: 'suggestions', items: [{ text: 'Who are the top scorers in qualifying?' }, { text: 'How do I get to the stadium?' }] }),
  B('sources', 'content', 'Where the facts come from.', {
    items: S.arr(S.obj({ title: S.str(), url: S.url(), publisher: opt(S.str()), date: opt(S.date()) })),
    verified: opt(S.bool()),
    checked: opt(S.date('When the sources were checked.')),
  }, { type: 'sources', verified: true, items: [{ title: 'Official squad', url: 'https://…', publisher: 'FSHF' }] }),
  B('countdown', 'content', 'Counts down to a moment.', { to: S.date(), label: opt(S.str()) }, { type: 'countdown', to: '2026-10-06T20:45:00+02:00', label: 'Kickoff' }),

  /* -------- sport -------- */
  B('match', 'sport', 'A match card: teams, score or kickoff, status, scorers. Any sport.', {
    sport: opt(S.str('football by default; basketball, volleyball, handball…')),
    competition: opt(S.str()),
    round: opt(S.str()),
    status: opt(S.en(['scheduled', 'live', 'halftime', 'finished', 'postponed', 'cancelled'])),
    minute: opt(S.str('Live clock, e.g. "67\'" or "Q3 4:12".')),
    kickoff: opt(S.date()),
    venue: opt(S.str()),
    home: Team,
    away: Team,
    score: opt(S.pair(S.int())),
    penalties: opt(S.pair(S.int())),
    scorers: opt(S.arr(S.obj({ team: Side, player: S.str(), minute: S.str(), type: opt(S.en(['goal', 'penalty', 'own-goal'])) }))),
    tv: opt(S.str()),
    tickets: opt(S.url()),
  }, { type: 'match', competition: 'Nations League C', status: 'scheduled', kickoff: '2026-10-06T20:45:00+02:00', home: { name: 'Albania', short: 'ALB' }, away: { name: 'San Marino', short: 'SMR' } }),
  B('lineup', 'sport', 'A starting lineup on a pitch. List the goalkeeper first, then each line from defence to attack, each line left to right as seen on screen with the team attacking upward. Players are placed from the formation, or give x/y (0–100) per player.', {
    formation: opt(S.str('e.g. "4-3-3", "3-4-3", "4-2-3-1".')),
    team: S.obj({ name: S.str(), color: opt(S.color()), kit: opt(Kit) }),
    players: S.arr(S.obj({ name: S.str(), number: opt(S.int()), pos: opt(S.str('GK, DF, MF, FW or a detailed role.')), captain: opt(S.bool()), rating: opt(S.num(undefined, 0, 10)), x: opt(S.num(undefined, 0, 100)), y: opt(S.num(undefined, 0, 100)) })),
    coach: opt(S.str()),
    bench: opt(S.arr(S.obj({ name: S.str(), number: opt(S.int()), pos: opt(S.str()) }))),
    opponent: opt(S.obj({ formation: opt(S.str()), team: S.obj({ name: S.str(), color: opt(S.color()), kit: opt(Kit) }), players: S.arr(S.obj({ name: S.str(), number: opt(S.int()), pos: opt(S.str()), captain: opt(S.bool()), x: opt(S.num()), y: opt(S.num()) })) }, 'Show both teams on one pitch.')),
    source: opt(Link),
    confirmed: opt(S.bool('Official lineup (true) or predicted (false).')),
  }, { type: 'lineup', formation: '3-4-3', team: { name: 'Albania', kit: { shirt: '#e41e2b', sleeves: '#111' } }, players: [{ name: 'Dajsinani', number: 23, pos: 'GK' }] }),
  B('events', 'sport', 'Match events on a timeline: goals, cards, substitutions, VAR.', {
    home: opt(S.str('Home team name.')),
    away: opt(S.str('Away team name.')),
    items: S.arr(S.obj({ minute: S.str(), team: opt(Side), type: S.en(['goal', 'penalty', 'own-goal', 'missed-penalty', 'yellow', 'second-yellow', 'red', 'sub', 'var', 'injury', 'period']), player: opt(S.str()), assist: opt(S.str()), in: opt(S.str('Player coming on.')), out: opt(S.str('Player going off.')), score: opt(S.str('Score after a goal, e.g. "1-0".')), note: opt(S.str()) })),
  }, { type: 'events', items: [{ minute: "12'", team: 'home', type: 'goal', player: 'Player name', score: '1-0' }] }),
  B('match-stats', 'sport', 'Team statistics compared, as mirrored bars.', {
    home: S.str(),
    away: S.str(),
    homeColor: opt(S.color()),
    awayColor: opt(S.color()),
    items: S.arr(S.obj({ label: S.str(), home: S.num(), away: S.num(), unit: opt(S.str()) })),
  }, { type: 'match-stats', home: 'Team A', away: 'Team B', items: [{ label: 'Possession', home: 61, away: 39, unit: '%' }] }),
  B('standings', 'sport', 'A league or group table. Columns appear for the fields you give.', {
    group: opt(S.str()),
    rows: S.arr(S.obj({ pos: S.int(), team: S.str(), logo: opt(S.img()), played: opt(S.int()), won: opt(S.int()), drawn: opt(S.int()), lost: opt(S.int()), gf: opt(S.int('Goals or points for.')), ga: opt(S.int('Goals or points against.')), gd: opt(S.int()), points: opt(S.num()), pct: opt(S.num('Win percentage, 0–1.')), form: opt(S.str('e.g. "WDLWW", newest last.')), zone: opt(S.en(['champions', 'promotion', 'europe', 'playoff', 'relegation'])) })),
    highlight: opt(S.str('Team name to highlight.')),
  }, { type: 'standings', group: 'Group A', rows: [{ pos: 1, team: 'Team A', played: 3, points: 7 }] }),
  B('h2h', 'sport', 'Head-to-head record and past meetings.', {
    home: S.str(),
    away: S.str(),
    summary: opt(S.obj({ home: S.int(), draw: S.int(), away: S.int() })),
    matches: S.arr(S.obj({ date: S.date(), home: S.str(), away: S.str(), score: S.str(), competition: opt(S.str()) })),
  }, { type: 'h2h', home: 'Team A', away: 'Team B', matches: [{ date: '2025-06-17', home: 'Team A', away: 'Team B', score: '2-0' }] }),
  B('player', 'sport', 'A player card with key stats. Any sport.', {
    name: S.str(),
    image: opt(S.img()),
    number: opt(S.int()),
    position: opt(S.str()),
    team: opt(S.str()),
    nationality: opt(S.str()),
    age: opt(S.int()),
    stats: opt(S.arr(S.obj({ label: S.str(), value: S.cell() }))),
    bio: opt(S.md()),
  }, { type: 'player', name: 'Player name', position: 'Midfielder', number: 8, stats: [{ label: 'Apps', value: 12 }] }),
  B('scoreboard', 'sport', 'Score by period for basketball, volleyball, hockey, handball, baseball, American football, rugby, cricket or esports.', {
    sport: S.str(),
    status: opt(S.en(['scheduled', 'live', 'halftime', 'finished', 'postponed', 'cancelled'])),
    clock: opt(S.str()),
    competition: opt(S.str()),
    home: Team,
    away: Team,
    periods: opt(S.arr(S.obj({ label: S.str(), home: S.cell(), away: S.cell() }))),
    total: opt(S.pair(S.cell())),
    leaders: opt(S.arr(S.obj({ team: Side, player: S.str(), stat: S.str() }))),
  }, { type: 'scoreboard', sport: 'basketball', status: 'live', clock: 'Q3 4:12', home: { name: 'Home' }, away: { name: 'Away' }, total: [61, 58] }),
  B('tennis', 'sport', 'A tennis (or padel, table tennis) match by sets.', {
    tournament: opt(S.str()),
    round: opt(S.str()),
    surface: opt(S.en(['hard', 'clay', 'grass', 'indoor'])),
    status: opt(S.en(['scheduled', 'live', 'finished', 'retired'])),
    players: S.pair(S.obj({ name: S.str(), country: opt(S.str('ISO country code.')), seed: opt(S.int()), serving: opt(S.bool()) })),
    sets: S.arr(S.obj({ a: S.int(), b: S.int(), tiebreak: opt(S.str('e.g. "7-5".')) })),
    points: opt(S.pair(S.str(), 'Current game points, e.g. ["40", "AD"].')),
  }, { type: 'tennis', players: [{ name: 'Player A' }, { name: 'Player B' }], sets: [{ a: 6, b: 4 }] }),
  B('race', 'sport', 'Race or session results: Formula 1, MotoGP, cycling, athletics, swimming.', {
    series: opt(S.str()),
    event: opt(S.str()),
    session: opt(S.str()),
    status: opt(S.en(['scheduled', 'live', 'finished'])),
    rows: S.arr(S.obj({ pos: S.int(), name: S.str(), number: opt(S.int()), team: opt(S.str()), color: opt(S.color()), time: opt(S.str()), gap: opt(S.str()), laps: opt(S.int()), points: opt(S.num()), fastest: opt(S.bool()), status: opt(S.str('DNF, DSQ…')) })),
  }, { type: 'race', series: 'Formula 1', event: 'Grand Prix', rows: [{ pos: 1, name: 'Driver', team: 'Team', color: '#e8002d', time: '1:14:40.727' }] }),
  B('fight', 'sport', 'A combat sports bout: MMA, boxing, kickboxing, judo, wrestling.', {
    event: opt(S.str()),
    division: opt(S.str()),
    rounds: opt(S.int()),
    status: opt(S.en(['scheduled', 'live', 'finished'])),
    fighters: S.pair(S.obj({ name: S.str(), nickname: opt(S.str()), record: opt(S.str('e.g. "22-3-0"')), country: opt(S.str()), image: opt(S.img()) })),
    result: opt(S.obj({ winner: S.int('0 or 1.', 0, 1), method: S.str(), round: opt(S.int()), time: opt(S.str()) })),
  }, { type: 'fight', fighters: [{ name: 'A', record: '12-1-0' }, { name: 'B', record: '10-2-0' }] }),
  B('bracket', 'sport', 'A knockout bracket for any sport.', {
    rounds: S.arr(S.obj({ name: S.str(), matches: S.arr(S.obj({ a: S.obj({ name: S.str(), score: opt(S.cell()) }), b: S.obj({ name: S.str(), score: opt(S.cell()) }), winner: opt(S.en(['a', 'b'])) })) })),
  }, { type: 'bracket', rounds: [{ name: 'Final', matches: [{ a: { name: 'Team A', score: 2 }, b: { name: 'Team B', score: 1 }, winner: 'a' }] }] }),

  /* -------- events & tickets -------- */
  B('event', 'event', 'An event: concert, match, festival, cinema, theatre.', {
    name: S.str(),
    image: opt(S.img()),
    start: S.date(),
    end: opt(S.date()),
    venue: opt(S.obj({ name: S.str(), city: opt(S.str()), address: opt(S.str()) })),
    category: opt(S.str()),
    artists: opt(S.arr(S.str())),
    priceFrom: opt(S.num()),
    currency: opt(S.str()),
    status: opt(S.en(['on-sale', 'few-left', 'sold-out', 'free', 'cancelled', 'postponed'])),
    url: opt(S.url()),
    cta: opt(S.str()),
  }, { type: 'event', name: 'Albania – San Marino', start: '2026-10-06T20:45:00+02:00', venue: { name: 'Air Albania Stadium', city: 'Tirana' }, priceFrom: 10, currency: 'EUR', status: 'on-sale' }),
  B('tickets', 'event', 'Ticket tiers to choose from.', {
    currency: opt(S.str()),
    tiers: S.arr(S.obj({ name: S.str(), price: S.num(), perks: opt(S.arr(S.str())), remaining: opt(S.int()), status: opt(S.en(['available', 'few-left', 'sold-out'])) })),
    url: opt(S.url('Checkout link; the chosen tier is added as ?tier=…')),
  }, { type: 'tickets', currency: 'EUR', tiers: [{ name: 'Lindja', price: 10 }, { name: 'VIP', price: 60, status: 'few-left' }] }),
  B('venue', 'event', 'A venue with address, capacity and how to get there.', { name: S.str(), image: opt(S.img()), address: opt(S.str()), city: opt(S.str()), capacity: opt(S.int()), lat: opt(S.num()), lng: opt(S.num()), transport: opt(S.arr(S.str())), url: opt(S.url()) }, { type: 'venue', name: 'Air Albania Stadium', city: 'Tirana', capacity: 22500 }),
  B('schedule', 'event', 'Running order: artists, sets, sessions, kickoffs.', { items: S.arr(S.obj({ time: S.str(), name: S.str(), stage: opt(S.str()), image: opt(S.img()), note: opt(S.str()) })) }, { type: 'schedule', items: [{ time: '22:00', name: 'Headliner', stage: 'Main' }] }),
  B('zones', 'event', 'A venue map with selectable zones and prices.', {
    layout: opt(S.en(['stadium', 'arena', 'theatre', 'club'])),
    currency: opt(S.str()),
    zones: S.arr(S.obj({ id: S.str('One of: north, south, east, west, vip, floor, balcony, stage-left, stage-right, or your own.'), name: S.str(), price: opt(S.num()), status: opt(S.en(['available', 'few-left', 'sold-out'])) })),
    url: opt(S.url('Checkout link; the chosen zone is added as ?zone=…')),
  }, { type: 'zones', layout: 'stadium', currency: 'EUR', zones: [{ id: 'west', name: 'Perëndimi', price: 25 }] }),
];

export const BLOCK_MAP: Record<string, BlockDef> = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));

/** Names models sometimes use, mapped to ours. */
const ALIASES: Record<string, string> = {
  markdown: 'text',
  paragraph: 'text',
  alert: 'callout',
  stack: 'group',
  grid: 'group',
  row: 'group',
  accordion: 'faq',
  kv: 'details',
  facts: 'details',
  keyvalue: 'details',
  kpi: 'stats',
  metrics: 'stats',
  graph: 'chart',
  formation: 'lineup',
  pitch: 'lineup',
  'starting-xi': 'lineup',
  score: 'match',
  fixture: 'match',
  game: 'match',
  stats: 'stats',
  'team-stats': 'match-stats',
  table_standings: 'standings',
  league: 'standings',
  'head-to-head': 'h2h',
  results: 'race',
  'f1': 'race',
  mma: 'fight',
  boxing: 'fight',
  citations: 'sources',
  references: 'sources',
  buttons: 'actions',
  related: 'suggestions',
  followups: 'suggestions',
  'follow-ups': 'suggestions',
  cta: 'actions',
  seatmap: 'zones',
  'seat-map': 'zones',
  lineup_artists: 'schedule',
};

/* ------------------------------------------------------------------ validation */

export interface UIError {
  path: string;
  message: string;
}

export interface Block {
  type: string;
  [k: string]: unknown;
}

export interface Doc {
  blocks: Block[];
  lang?: string;
}

export interface ValidateOptions {
  /** While streaming: missing required fields are not errors and unfinished items are kept. */
  partial?: boolean;
  /** Keep blocks of unknown types (rendered as nothing) instead of dropping them. */
  keepUnknown?: boolean;
}

export interface Validated {
  ok: boolean;
  doc: Doc;
  errors: UIError[];
}

const COLOR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([\d\s.,%/+-]+\)|[a-z]{3,24})$/i;
/** Links may be relative or use http(s), mailto or tel: any other scheme (javascript:, data:…) is refused. */
const SAFE_URL = /^(https?:|mailto:|tel:|(?![a-z][a-z0-9+.-]*:)[^\s])/i;

function checkString(v: unknown, f: Format | undefined, path: string, errors: UIError[]): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number' || typeof v === 'boolean') v = String(v);
  if (typeof v !== 'string') {
    errors.push({ path, message: 'expected text' });
    return undefined;
  }
  let s = f === 'markdown' ? v : v.trim();
  if (f === 'url' || f === 'image') s = s.replace(/[\u0000-\u0020\u007f]+/g, '');
  if ((f === 'url' || f === 'image') && s) {
    if (!SAFE_URL.test(s) && !(f === 'image' && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(s))) {
      errors.push({ path, message: 'unsafe or invalid URL' });
      return undefined;
    }
  }
  if (f === 'color' && s && !COLOR.test(s)) {
    errors.push({ path, message: 'invalid color' });
    return undefined;
  }
  if (f === 'date' && s && Number.isNaN(Date.parse(s)) && !/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(s)) {
    errors.push({ path, message: 'invalid date' });
    return undefined;
  }
  return s;
}

function check(type: T, v: unknown, path: string, errors: UIError[], o: ValidateOptions): unknown {
  if (v === undefined || v === null || (v === '' && type.kind !== 'string')) return undefined;
  switch (type.kind) {
    case 'string':
      return checkString(v, type.format, path, errors);
    case 'cell':
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return checkString(v, undefined, path, errors);
    case 'number':
    case 'integer': {
      let n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[%\s]/g, '').replace(',', '.')) : NaN;
      if (!Number.isFinite(n)) {
        errors.push({ path, message: 'expected a number' });
        return undefined;
      }
      if (type.kind === 'integer') n = Math.round(n);
      if (type.min !== undefined && n < type.min) n = type.min;
      if (type.max !== undefined && n > type.max) n = type.max;
      return n;
    }
    case 'boolean':
      if (typeof v === 'boolean') return v;
      if (v === 'true' || v === 1 || v === '1' || v === 'yes') return true;
      if (v === 'false' || v === 0 || v === '0' || v === 'no') return false;
      errors.push({ path, message: 'expected true or false' });
      return undefined;
    case 'enum': {
      const s = String(v).trim().toLowerCase().replace(/[\s_]+/g, '-');
      const hit = type.values!.find((x) => x === s) ?? type.values!.find((x) => x.startsWith(s) || s.startsWith(x));
      if (!hit) {
        errors.push({ path, message: `expected one of ${type.values!.join(', ')}` });
        return undefined;
      }
      return hit;
    }
    case 'array': {
      const list = Array.isArray(v) ? v : [v];
      const out: unknown[] = [];
      const of = type.of!;
      // Items missing a required field are left out (a button without a working link, a player
      // whose name has not streamed in yet); the error is still reported when not streaming.
      const required = of.kind === 'object' && of.props ? Object.entries(of.props).filter(([, d]) => !d.optional).map(([k]) => k) : [];
      list.forEach((item, i) => {
        const p = `${path}[${i}]`;
        const before = errors.length;
        const c = of.kind === 'block' ? checkBlock(item, p, errors, o) : check(of, item, p, errors, o);
        if (c === undefined) return;
        if (required.some((k) => (c as Record<string, unknown>)[k] === undefined)) {
          if (o.partial) errors.length = before;
          else if (errors.length === before) errors.push({ path: p, message: 'missing required fields' });
          return;
        }
        out.push(c);
      });
      if (type.length && out.length !== type.length && !o.partial) errors.push({ path, message: `expected ${type.length} items` });
      return out;
    }
    case 'object': {
      if (typeof v !== 'object' || Array.isArray(v)) {
        errors.push({ path, message: 'expected an object' });
        return undefined;
      }
      const src = v as Record<string, unknown>;
      // An empty props map means "free-form": keep string-ish values (compare.values).
      if (!type.props || !Object.keys(type.props).length) {
        const out: Record<string, string | number> = {};
        for (const [k, x] of Object.entries(src)) {
          if (typeof x === 'string' || typeof x === 'number') out[k] = x;
          else if (typeof x === 'boolean') out[k] = x ? '✓' : '—';
        }
        return out;
      }
      return checkProps(type.props, src, path, errors, o);
    }
    case 'block':
      return checkBlock(v, path, errors, o);
  }
}

function checkProps(props: Record<string, T>, src: Record<string, unknown>, path: string, errors: UIError[], o: ValidateOptions) {
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(props)) {
    const p = path ? `${path}.${k}` : k;
    const c = check(def, src[k], p, errors, o);
    if (c === undefined) {
      if (!def.optional && !o.partial && src[k] === undefined) errors.push({ path: p, message: 'is required' });
      continue;
    }
    out[k] = c;
  }
  return out;
}

function checkBlock(v: unknown, path: string, errors: UIError[], o: ValidateOptions): Block | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    errors.push({ path, message: 'expected a block object' });
    return undefined;
  }
  const src = v as Record<string, unknown>;
  const raw = String(src.type ?? src.block ?? src.kind ?? '').trim().toLowerCase();
  const type = BLOCK_MAP[raw] ? raw : ALIASES[raw];
  if (!type) {
    if (!raw && o.partial) return undefined;
    errors.push({ path: `${path}.type`, message: raw ? `unknown block "${raw}"` : 'missing type' });
    return o.keepUnknown ? { type: raw || 'unknown' } : undefined;
  }
  const def = BLOCK_MAP[type];
  const out = checkProps({ ...COMMON, ...def.props }, src, path, errors, o) as Block;
  out.type = type;
  return out;
}

/**
 * Cleans what a model wrote: accepts a doc, a list of blocks or one block (also as a JSON string,
 * even wrapped in ```json fences). Coerces types, drops unknown props and unsafe URLs, and reports
 * what it fixed so you can send the errors back to the model.
 */
export function validate(input: unknown, o: ValidateOptions = {}): Validated {
  const errors: UIError[] = [];
  let v = input;
  if (typeof v === 'string') {
    const fenced = /```(?:json)?\s*([\s\S]*?)(?:```|$)/i.exec(v);
    const s = fenced ? fenced[1] : v;
    try {
      v = JSON.parse(s.slice(Math.max(0, s.search(/[[{]/))));
    } catch {
      return { ok: false, doc: { blocks: [] }, errors: [{ path: '', message: 'not valid JSON' }] };
    }
  }
  let list: unknown[];
  let lang: string | undefined;
  if (Array.isArray(v)) list = v;
  else if (v && typeof v === 'object' && Array.isArray((v as Doc).blocks)) {
    list = (v as Doc).blocks;
    lang = typeof (v as Doc).lang === 'string' ? (v as Doc).lang : undefined;
  } else if (v && typeof v === 'object' && 'type' in (v as object)) list = [v];
  else return { ok: false, doc: { blocks: [] }, errors: [{ path: '', message: 'expected { blocks: [...] }' }] };
  const blocks: Block[] = [];
  list.forEach((b, i) => {
    const c = checkBlock(b, `blocks[${i}]`, errors, o);
    if (c) blocks.push(c);
  });
  return { ok: errors.length === 0, doc: lang ? { blocks, lang } : { blocks }, errors };
}

/* ------------------------------------------------------------------ JSON Schema */

type JSONSchema = Record<string, unknown>;

function toSchema(type: T): JSONSchema {
  const base: JSONSchema = type.desc ? { description: type.desc } : {};
  switch (type.kind) {
    case 'string':
      return { ...base, type: 'string', ...(type.format === 'url' || type.format === 'image' ? { format: 'uri-reference' } : type.format === 'date' ? { description: (type.desc ? type.desc + ' ' : '') + 'ISO 8601 date or date-time.' } : {}) };
    case 'cell':
      return { ...base, type: ['string', 'number'] };
    case 'number':
    case 'integer':
      return { ...base, type: type.kind, ...(type.min !== undefined ? { minimum: type.min } : {}), ...(type.max !== undefined ? { maximum: type.max } : {}) };
    case 'boolean':
      return { ...base, type: 'boolean' };
    case 'enum':
      return { ...base, type: 'string', enum: [...type.values!] };
    case 'array':
      return { ...base, type: 'array', items: toSchema(type.of!), ...(type.length ? { minItems: type.length, maxItems: type.length } : {}) };
    case 'object': {
      if (!type.props || !Object.keys(type.props).length) return { ...base, type: 'object', additionalProperties: { type: ['string', 'number'] } };
      const required = Object.entries(type.props).filter(([, d]) => !d.optional).map(([k]) => k);
      return { ...base, type: 'object', properties: Object.fromEntries(Object.entries(type.props).map(([k, d]) => [k, toSchema(d)])), ...(required.length ? { required } : {}), additionalProperties: false };
    }
    case 'block':
      return { $ref: '#/$defs/block' };
  }
}

/** JSON Schema for one block type. */
export function blockSchema(type: string): JSONSchema {
  const def = BLOCK_MAP[type];
  const s = toSchema(S.obj({ type: S.en([type]), ...COMMON, ...def.props })) as JSONSchema & { properties: Record<string, JSONSchema> };
  s.properties.type = { const: type };
  s.description = def.desc;
  return s;
}

/**
 * JSON Schema for a whole UI document: `{ blocks: Block[] }`. Pass `types` to offer only some
 * blocks (smaller prompts, focused tools).
 */
export function jsonSchema(types: string[] = BLOCKS.map((b) => b.type)): JSONSchema {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: { blocks: { type: 'array', items: { $ref: '#/$defs/block' } }, lang: { type: 'string', description: 'Language of labels: en or sq.' } },
    required: ['blocks'],
    $defs: { block: { oneOf: types.filter((x) => BLOCK_MAP[x]).map(blockSchema) } },
  };
}

/* ------------------------------------------------------------------ compact reference for prompts */

function typeText(type: T, depth = 0): string {
  switch (type.kind) {
    case 'string':
      return type.format === 'markdown' ? 'md' : type.format === 'url' || type.format === 'image' ? 'url' : type.format === 'date' ? 'iso-date' : type.format === 'color' ? 'color' : 'str';
    case 'cell':
      return 'str|num';
    case 'number':
      return 'num';
    case 'integer':
      return 'int';
    case 'boolean':
      return 'bool';
    case 'enum':
      return type.values!.map((x) => `"${x}"`).join('|');
    case 'array':
      return type.length ? `[${typeText(type.of!, depth)}, ${typeText(type.of!, depth)}]` : `${typeText(type.of!, depth)}[]`;
    case 'block':
      return 'Block';
    case 'object':
      if (!type.props || !Object.keys(type.props).length) return '{[attr]: str}';
      return `{ ${Object.entries(type.props)
        .map(([k, d]) => `${k}${d.optional ? '?' : ''}: ${typeText(d, depth + 1)}`)
        .join(', ')} }`;
  }
}

/**
 * A compact reference of the blocks for a system prompt (about 2–3k tokens for everything).
 * Pass `types` to include only some.
 */
export function prompt(types: string[] = BLOCKS.map((b) => b.type)): string {
  const lines = [
    'You can answer with rich UI. Reply with JSON: {"blocks": [Block, ...]}. Every block has "type" and may have "title", "note" and "id".',
    'Use blocks for structured facts (scores, lineups, tables, tickets, weather, places) and "text" blocks for prose. Prefer one clear block over many. Never invent data: leave out fields you do not know.',
    'Dates are ISO 8601 with a time zone. Colors are hex. Markdown (md) allows **bold**, *italic*, [links](https://…) and "- " lists.',
    '',
  ];
  for (const b of BLOCKS) {
    if (!types.includes(b.type)) continue;
    lines.push(`${b.type}: ${b.desc}`);
    lines.push(`  ${typeText(S.obj(b.props))}`);
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------ tool definitions */

export interface ToolOptions {
  name?: string;
  types?: string[];
  description?: string;
}

const toolDescription = (o: ToolOptions) =>
  o.description ??
  'Show the answer as rich UI blocks (match cards, lineups, tables, charts, tickets, weather, places…) that render inline for the user. Use it whenever structured facts read better as UI than as text.';

/** A tool definition for the Anthropic Messages API (`tools: [lumafxTool()]`). */
export function anthropicTool(o: ToolOptions = {}) {
  return { name: o.name ?? 'render_ui', description: toolDescription(o), input_schema: jsonSchema(o.types) };
}

/** A function tool for the OpenAI Responses / Chat Completions APIs. */
export function openaiTool(o: ToolOptions = {}) {
  return { type: 'function' as const, name: o.name ?? 'render_ui', description: toolDescription(o), parameters: jsonSchema(o.types) };
}
