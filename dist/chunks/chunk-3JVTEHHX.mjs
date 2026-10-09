// src/ui/schema.ts
var t = (kind, extra = {}) => ({ kind, ...extra });
var S = {
  str: (desc) => t("string", { desc }),
  md: (desc) => t("string", { desc, format: "markdown" }),
  url: (desc) => t("string", { desc, format: "url" }),
  img: (desc) => t("string", { desc, format: "image" }),
  date: (desc) => t("string", { desc, format: "date" }),
  color: (desc) => t("string", { desc, format: "color" }),
  num: (desc, min, max) => t("number", { desc, min, max }),
  int: (desc, min, max) => t("integer", { desc, min, max }),
  bool: (desc) => t("boolean", { desc }),
  en: (values, desc) => t("enum", { values, desc }),
  arr: (of, desc) => t("array", { of, desc }),
  pair: (of, desc) => t("array", { of, desc, length: 2 }),
  obj: (props, desc) => t("object", { props, desc }),
  /** A string or a number: table cells, stat values. */
  cell: (desc) => t("cell", { desc }),
  blocks: (desc) => t("array", { of: t("block"), desc })
};
var opt = (x) => ({ ...x, optional: true });
var Team = S.obj({
  name: S.str("Full name."),
  short: opt(S.str("Short code, e.g. ALB.")),
  logo: opt(S.img("Crest or logo URL.")),
  color: opt(S.color("Main team color.")),
  rank: opt(S.int("Ranking or seed.")),
  form: opt(S.str('Recent results, newest last, e.g. "WWDLW".'))
});
var Kit = S.obj({
  shirt: opt(S.color()),
  sleeves: opt(S.color()),
  number: opt(S.color("Number color."))
});
var Side = S.en(["home", "away"]);
var Link = S.obj({ label: S.str(), url: S.url() });
var COMMON = {
  id: opt(S.str("Stable id, for live updates.")),
  title: opt(S.str("Heading shown above the block.")),
  note: opt(S.md("Small print under the block.")),
  live: opt(S.obj({ adapter: S.str(), id: S.str(), every: opt(S.int("Seconds between refreshes.", 5)) }, "Keep the block updated through a registered data adapter.")),
  evidence: opt(
    S.obj(
      {
        status: S.en(["verified", "reported", "unconfirmed", "analysis"], "verified: confirmed by an official source; reported: from a credible outlet; analysis: your reading, not fact."),
        asOf: opt(S.date("When it was last checked.")),
        source: opt(S.str("Who confirms it, e.g. FSHF.")),
        url: opt(S.url())
      },
      "How sure this block is and who says so. Shown as a small line under it."
    )
  )
};
var B = (type, group, desc, props, example) => ({ type, group, desc, props, example });
var BLOCKS = [
  /* -------- content -------- */
  B("text", "content", 'Paragraphs of markdown: **bold**, *italic*, `code`, [links](https://\u2026), "- " lists.', { md: S.md() }, { type: "text", md: "Kickoff is at **20:45** at Air Albania Stadium." }),
  B("callout", "content", "A highlighted message.", { tone: opt(S.en(["info", "success", "warning", "danger", "tip"])), text: S.md() }, { type: "callout", tone: "warning", text: "Gates open 90 minutes before kickoff." }),
  B("group", "content", "Lays out other blocks in a stack, a row or a grid.", { layout: opt(S.en(["stack", "row", "grid"])), columns: opt(S.int(void 0, 1, 4)), blocks: S.blocks() }, { type: "group", layout: "grid", columns: 2, blocks: [] }),
  B("tabs", "content", "Tabs, each holding blocks.", { tabs: S.arr(S.obj({ label: S.str(), blocks: S.blocks() })) }, { type: "tabs", tabs: [{ label: "Preview", blocks: [] }] }),
  B("faq", "content", "Questions that expand to answers.", { items: S.arr(S.obj({ q: S.str(), a: S.md() })) }, { type: "faq", items: [{ q: "Is the lineup confirmed?", a: "Yes, all eleven." }] }),
  B("details", "content", "Label and value pairs, such as match or event facts.", { items: S.arr(S.obj({ label: S.str(), value: S.str(), icon: opt(S.str("One emoji.")), url: opt(S.url()) })) }, { type: "details", items: [{ label: "Stadium", value: "Air Albania, Tirana", icon: "\u{1F3DF}" }] }),
  B("table", "data", "A table. Rows are arrays of cells in column order. Readers can sort it by any column; number columns can show bars.", {
    columns: S.arr(S.obj({ label: S.str(), align: opt(S.en(["left", "center", "right"])), format: opt(S.en(["text", "number", "percent", "money", "date", "datetime"])), bar: opt(S.bool("Draw this number column as bars too.")) })),
    rows: S.arr(S.arr(S.cell())),
    highlight: opt(S.int("Row index to highlight.")),
    currency: opt(S.str("ISO code for money columns.")),
    sortable: opt(S.bool("Sort by clicking a column (default: on from 3 rows).")),
    filter: opt(S.bool("A search box over the rows (default: on from 12 rows)."))
  }, { type: "table", columns: [{ label: "Team" }, { label: "Points", align: "right", bar: true }], rows: [["Team A", 12]] }),
  B("stats", "data", "Headline numbers.", {
    items: S.arr(S.obj({ label: S.str(), value: S.cell(), unit: opt(S.str()), delta: opt(S.num("Change in % vs. the previous period.")), period: opt(S.str("What the delta compares to.")), good: opt(S.en(["up", "down"], "Which direction is good.")), trend: opt(S.arr(S.num())) }))
  }, { type: "stats", items: [{ label: "Tickets sold", value: 18420, delta: 12, period: "vs. last match" }] }),
  B("chart", "data", "A chart: line, area, bar (horizontal), column, stacked or donut. One axis only.", {
    kind: S.en(["line", "area", "column", "bar", "stacked", "donut"]),
    labels: S.arr(S.str(), "X-axis categories (or donut slice names)."),
    series: S.arr(S.obj({ name: S.str(), values: S.arr(S.num()) })),
    unit: opt(S.str()),
    min: opt(S.num()),
    max: opt(S.num())
  }, { type: "chart", kind: "line", labels: ["Mar", "Jun", "Sep"], series: [{ name: "Goals", values: [3, 5, 4] }] }),
  B("steps", "content", "Numbered steps.", { items: S.arr(S.obj({ title: S.str(), text: opt(S.md()) })) }, { type: "steps", items: [{ title: "Open eBileta", text: "Choose the match." }] }),
  B("timeline", "content", "Events in time order.", { items: S.arr(S.obj({ time: S.str(), title: S.str(), text: opt(S.md()), icon: opt(S.str("One emoji.")) })) }, { type: "timeline", items: [{ time: "18:00", title: "Gates open" }] }),
  B("compare", "data", "Options side by side on the same attributes.", {
    items: S.arr(S.obj({ name: S.str(), image: opt(S.img()), price: opt(S.str()), badge: opt(S.str()), url: opt(S.url()), values: S.obj({}, "Attribute \u2192 value.") })),
    attributes: opt(S.arr(S.str(), "Row order."))
  }, { type: "compare", items: [{ name: "Standard", price: "\u20AC15", values: { View: "Behind the goal" } }] }),
  B("product", "content", "One product or offer.", { name: S.str(), image: opt(S.img()), price: opt(S.num()), oldPrice: opt(S.num()), currency: opt(S.str()), rating: opt(S.num(void 0, 0, 5)), reviews: opt(S.int()), badge: opt(S.str()), text: opt(S.md()), url: opt(S.url()), cta: opt(S.str()) }, { type: "product", name: "Home shirt 2026", price: 75, currency: "EUR" }),
  B("gallery", "content", "Images in a grid.", { images: S.arr(S.obj({ src: S.img(), alt: S.str(), caption: opt(S.str()) })) }, { type: "gallery", images: [{ src: "https://\u2026/1.jpg", alt: "Training" }] }),
  B("image", "content", "One image with a caption.", { src: S.img(), alt: S.str(), caption: opt(S.str()) }, { type: "image", src: "https://\u2026/hero.jpg", alt: "The team before training" }),
  B("quote", "content", "A quote.", { text: S.str(), author: opt(S.str()), role: opt(S.str()), image: opt(S.img()) }, { type: "quote", text: "We want to start fast.", author: "Head coach", role: "Press conference" }),
  B("progress", "data", "Progress bars.", { items: S.arr(S.obj({ label: S.str(), value: S.num(), max: opt(S.num()), tone: opt(S.en(["accent", "good", "warning", "critical"])) })) }, { type: "progress", items: [{ label: "Sold", value: 82, max: 100 }] }),
  B("weather", "data", "Current weather and a forecast.", {
    location: S.str(),
    units: opt(S.en(["c", "f"])),
    now: S.obj({ temp: S.num(), condition: S.str(), icon: opt(S.en(["sun", "partly", "cloud", "rain", "storm", "snow", "fog", "wind", "night"])), feels: opt(S.num()), humidity: opt(S.num()), wind: opt(S.str()) }),
    hours: opt(S.arr(S.obj({ time: S.str(), temp: S.num(), icon: opt(S.en(["sun", "partly", "cloud", "rain", "storm", "snow", "fog", "wind", "night"])), rain: opt(S.num("Chance of rain, %.")) }))),
    days: opt(S.arr(S.obj({ day: S.str(), hi: S.num(), lo: S.num(), icon: opt(S.en(["sun", "partly", "cloud", "rain", "storm", "snow", "fog", "wind", "night"])), rain: opt(S.num("Chance of rain, %.")) })))
  }, { type: "weather", location: "Tirana", now: { temp: 21, condition: "Clear", icon: "sun" } }),
  B("places", "content", "A list of places with ratings and map links.", {
    items: S.arr(S.obj({ name: S.str(), category: opt(S.str()), address: opt(S.str()), rating: opt(S.num(void 0, 0, 5)), price: opt(S.str("e.g. \u20AC\u20AC")), image: opt(S.img()), url: opt(S.url()), lat: opt(S.num()), lng: opt(S.num()), note: opt(S.str()) }))
  }, { type: "places", items: [{ name: "Mullixhiu", category: "Restaurant", rating: 4.7 }] }),
  B("itinerary", "content", "A plan by day.", { days: S.arr(S.obj({ label: S.str(), stops: S.arr(S.obj({ time: opt(S.str()), name: S.str(), note: opt(S.str()), url: opt(S.url()) })) })) }, { type: "itinerary", days: [{ label: "Saturday", stops: [{ time: "10:00", name: "Skanderbeg Square" }] }] }),
  B("quiz", "content", "Multiple-choice questions with feedback.", { questions: S.arr(S.obj({ q: S.str(), options: S.arr(S.str()), answer: S.int("Index of the correct option."), explain: opt(S.md()) })) }, { type: "quiz", questions: [{ q: "How long is a football match?", options: ["80 minutes", "90 minutes"], answer: 1 }] }),
  B("actions", "content", "Buttons that link somewhere.", { buttons: S.arr(S.obj({ label: S.str(), url: S.url(), style: opt(S.en(["primary", "secondary", "ghost"])) })) }, { type: "actions", buttons: [{ label: "Buy tickets", url: "https://\u2026", style: "primary" }] }),
  B("video", "content", "A YouTube or Vimeo video, or a playlist of them. Nothing loads from YouTube until the reader presses play.", {
    url: opt(S.url("YouTube or Vimeo link.")),
    title: opt(S.str()),
    channel: opt(S.str()),
    poster: opt(S.img()),
    start: opt(S.int("Start at this second.", 0)),
    date: opt(S.date("Upload date.")),
    items: opt(S.arr(S.obj({ url: S.url(), title: S.str(), channel: opt(S.str()), poster: opt(S.img()), start: opt(S.int(void 0, 0)) }), "Several videos: one player with a list to pick from."))
  }, { type: "video", items: [{ url: "https://www.youtube.com/watch?v=\u2026", title: "Artist \u2014 Song", channel: "Official channel" }] }),
  B("artists", "content", "Artists or performers: photo, genres, a short bio and where to listen.", {
    items: S.arr(
      S.obj({
        name: S.str(),
        image: opt(S.img()),
        role: opt(S.str("headliner, support, DJ\u2026")),
        genres: opt(S.arr(S.str())),
        bio: opt(S.md()),
        url: opt(S.url("Profile page.")),
        spotify: opt(S.url()),
        youtube: opt(S.url()),
        instagram: opt(S.url())
      })
    )
  }, { type: "artists", items: [{ name: "Renis Gjoka", genres: ["Rock"], spotify: "https://open.spotify.com/artist/\u2026" }] }),
  B("poll", "content", "A question readers vote on (a match prediction, a favourite song), with results.", {
    question: S.str(),
    options: S.arr(S.obj({ label: S.str(), votes: opt(S.int(void 0, 0)) })),
    closes: opt(S.date())
  }, { type: "poll", question: "Who wins tonight?", options: [{ label: "Albania" }, { label: "Draw" }, { label: "San Marino" }] }),
  B("suggestions", "content", "Follow-up questions the reader can ask next (chips). Clicking one asks it in chat; with a url it is a link.", { items: S.arr(S.obj({ text: S.str(), url: opt(S.url()) })) }, { type: "suggestions", items: [{ text: "Who are the top scorers in qualifying?" }, { text: "How do I get to the stadium?" }] }),
  B("sources", "content", "Where the facts come from.", {
    items: S.arr(S.obj({ title: S.str(), url: S.url(), publisher: opt(S.str()), date: opt(S.date()) })),
    verified: opt(S.bool()),
    checked: opt(S.date("When the sources were checked."))
  }, { type: "sources", verified: true, items: [{ title: "Official squad", url: "https://\u2026", publisher: "FSHF" }] }),
  B("countdown", "content", "Counts down to a moment.", { to: S.date(), label: opt(S.str()) }, { type: "countdown", to: "2026-10-06T20:45:00+02:00", label: "Kickoff" }),
  /* -------- sport -------- */
  B("match", "sport", "A match card: teams, score or kickoff, status, scorers. Any sport.", {
    sport: opt(S.str("football by default; basketball, volleyball, handball\u2026")),
    competition: opt(S.str()),
    round: opt(S.str()),
    status: opt(S.en(["scheduled", "live", "halftime", "finished", "postponed", "cancelled"])),
    minute: opt(S.str(`Live clock, e.g. "67'" or "Q3 4:12".`)),
    kickoff: opt(S.date()),
    venue: opt(S.str()),
    home: Team,
    away: Team,
    score: opt(S.pair(S.int())),
    penalties: opt(S.pair(S.int())),
    scorers: opt(S.arr(S.obj({ team: Side, player: S.str(), minute: S.str(), type: opt(S.en(["goal", "penalty", "own-goal"])) }))),
    tv: opt(S.str()),
    tickets: opt(S.url()),
    url: opt(S.url("The match page, linked once it has started."))
  }, { type: "match", competition: "Nations League C", status: "scheduled", kickoff: "2026-10-06T20:45:00+02:00", home: { name: "Albania", short: "ALB" }, away: { name: "San Marino", short: "SMR" } }),
  B("lineup", "sport", "A starting lineup on a pitch. List the goalkeeper first, then each line from defence to attack, each line left to right as seen on screen with the team attacking upward. Players are placed from the formation, or give x/y (0\u2013100) per player.", {
    formation: opt(S.str('e.g. "4-3-3", "3-4-3", "4-2-3-1".')),
    team: S.obj({ name: S.str(), color: opt(S.color()), kit: opt(Kit) }),
    players: S.arr(S.obj({ name: S.str(), number: opt(S.int()), pos: opt(S.str("GK, DF, MF, FW or a detailed role.")), captain: opt(S.bool()), rating: opt(S.num(void 0, 0, 10)), x: opt(S.num(void 0, 0, 100)), y: opt(S.num(void 0, 0, 100)) })),
    coach: opt(S.str()),
    bench: opt(S.arr(S.obj({ name: S.str(), number: opt(S.int()), pos: opt(S.str()) }))),
    opponent: opt(S.obj({ formation: opt(S.str()), team: S.obj({ name: S.str(), color: opt(S.color()), kit: opt(Kit) }), players: S.arr(S.obj({ name: S.str(), number: opt(S.int()), pos: opt(S.str()), captain: opt(S.bool()), x: opt(S.num()), y: opt(S.num()) })) }, "Show both teams on one pitch.")),
    source: opt(Link),
    confirmed: opt(S.bool("Official lineup (true) or predicted (false)."))
  }, { type: "lineup", formation: "3-4-3", team: { name: "Albania", kit: { shirt: "#e41e2b", sleeves: "#111" } }, players: [{ name: "Dajsinani", number: 23, pos: "GK" }] }),
  B("events", "sport", "Match events on a timeline: goals, cards, substitutions, VAR.", {
    home: opt(S.str("Home team name.")),
    away: opt(S.str("Away team name.")),
    items: S.arr(S.obj({ minute: S.str(), team: opt(Side), type: S.en(["goal", "penalty", "own-goal", "missed-penalty", "yellow", "second-yellow", "red", "sub", "var", "injury", "period"]), player: opt(S.str()), assist: opt(S.str()), in: opt(S.str("Player coming on.")), out: opt(S.str("Player going off.")), score: opt(S.str('Score after a goal, e.g. "1-0".')), note: opt(S.str()) }))
  }, { type: "events", items: [{ minute: "12'", team: "home", type: "goal", player: "Player name", score: "1-0" }] }),
  B("match-stats", "sport", "Team statistics compared, as mirrored bars.", {
    home: S.str(),
    away: S.str(),
    homeColor: opt(S.color()),
    awayColor: opt(S.color()),
    items: S.arr(S.obj({ label: S.str(), home: S.num(), away: S.num(), unit: opt(S.str()) }))
  }, { type: "match-stats", home: "Team A", away: "Team B", items: [{ label: "Possession", home: 61, away: 39, unit: "%" }] }),
  B("standings", "sport", "A league or group table. Columns appear for the fields you give.", {
    group: opt(S.str()),
    rows: S.arr(S.obj({ pos: S.int(), team: S.str(), logo: opt(S.img()), played: opt(S.int()), won: opt(S.int()), drawn: opt(S.int()), lost: opt(S.int()), gf: opt(S.int("Goals or points for.")), ga: opt(S.int("Goals or points against.")), gd: opt(S.int()), points: opt(S.num()), pct: opt(S.num("Win percentage, 0\u20131.")), form: opt(S.str('e.g. "WDLWW", newest last.')), zone: opt(S.en(["champions", "promotion", "europe", "playoff", "relegation"])) })),
    highlight: opt(S.str("Team name to highlight."))
  }, { type: "standings", group: "Group A", rows: [{ pos: 1, team: "Team A", played: 3, points: 7 }] }),
  B("h2h", "sport", "Head-to-head record and past meetings.", {
    home: S.str(),
    away: S.str(),
    summary: opt(S.obj({ home: S.int(), draw: S.int(), away: S.int() })),
    matches: S.arr(S.obj({ date: S.date(), home: S.str(), away: S.str(), score: S.str(), competition: opt(S.str()) }))
  }, { type: "h2h", home: "Team A", away: "Team B", matches: [{ date: "2025-06-17", home: "Team A", away: "Team B", score: "2-0" }] }),
  B("player", "sport", "A player card with key stats. Any sport.", {
    name: S.str(),
    image: opt(S.img()),
    number: opt(S.int()),
    position: opt(S.str()),
    team: opt(S.str()),
    nationality: opt(S.str()),
    age: opt(S.int()),
    stats: opt(S.arr(S.obj({ label: S.str(), value: S.cell() }))),
    bio: opt(S.md())
  }, { type: "player", name: "Player name", position: "Midfielder", number: 8, stats: [{ label: "Apps", value: 12 }] }),
  B("scoreboard", "sport", "Score by period for basketball, volleyball, hockey, handball, baseball, American football, rugby, cricket or esports.", {
    sport: S.str(),
    status: opt(S.en(["scheduled", "live", "halftime", "finished", "postponed", "cancelled"])),
    clock: opt(S.str()),
    competition: opt(S.str()),
    home: Team,
    away: Team,
    periods: opt(S.arr(S.obj({ label: S.str(), home: S.cell(), away: S.cell() }))),
    total: opt(S.pair(S.cell())),
    leaders: opt(S.arr(S.obj({ team: Side, player: S.str(), stat: S.str() })))
  }, { type: "scoreboard", sport: "basketball", status: "live", clock: "Q3 4:12", home: { name: "Home" }, away: { name: "Away" }, total: [61, 58] }),
  B("tennis", "sport", "A tennis (or padel, table tennis) match by sets.", {
    tournament: opt(S.str()),
    round: opt(S.str()),
    surface: opt(S.en(["hard", "clay", "grass", "indoor"])),
    status: opt(S.en(["scheduled", "live", "finished", "retired"])),
    players: S.pair(S.obj({ name: S.str(), country: opt(S.str("ISO country code.")), seed: opt(S.int()), serving: opt(S.bool()) })),
    sets: S.arr(S.obj({ a: S.int(), b: S.int(), tiebreak: opt(S.str('e.g. "7-5".')) })),
    points: opt(S.pair(S.str(), 'Current game points, e.g. ["40", "AD"].'))
  }, { type: "tennis", players: [{ name: "Player A" }, { name: "Player B" }], sets: [{ a: 6, b: 4 }] }),
  B("race", "sport", "Race or session results: Formula 1, MotoGP, cycling, athletics, swimming.", {
    series: opt(S.str()),
    event: opt(S.str()),
    session: opt(S.str()),
    status: opt(S.en(["scheduled", "live", "finished"])),
    rows: S.arr(S.obj({ pos: S.int(), name: S.str(), number: opt(S.int()), team: opt(S.str()), color: opt(S.color()), time: opt(S.str()), gap: opt(S.str()), laps: opt(S.int()), points: opt(S.num()), fastest: opt(S.bool()), status: opt(S.str("DNF, DSQ\u2026")) }))
  }, { type: "race", series: "Formula 1", event: "Grand Prix", rows: [{ pos: 1, name: "Driver", team: "Team", color: "#e8002d", time: "1:14:40.727" }] }),
  B("fight", "sport", "A combat sports bout: MMA, boxing, kickboxing, judo, wrestling.", {
    event: opt(S.str()),
    division: opt(S.str()),
    rounds: opt(S.int()),
    status: opt(S.en(["scheduled", "live", "finished"])),
    fighters: S.pair(S.obj({ name: S.str(), nickname: opt(S.str()), record: opt(S.str('e.g. "22-3-0"')), country: opt(S.str()), image: opt(S.img()) })),
    result: opt(S.obj({ winner: S.int("0 or 1.", 0, 1), method: S.str(), round: opt(S.int()), time: opt(S.str()) }))
  }, { type: "fight", fighters: [{ name: "A", record: "12-1-0" }, { name: "B", record: "10-2-0" }] }),
  B("bracket", "sport", "A knockout bracket for any sport.", {
    rounds: S.arr(S.obj({ name: S.str(), matches: S.arr(S.obj({ a: S.obj({ name: S.str(), score: opt(S.cell()) }), b: S.obj({ name: S.str(), score: opt(S.cell()) }), winner: opt(S.en(["a", "b"])) })) }))
  }, { type: "bracket", rounds: [{ name: "Final", matches: [{ a: { name: "Team A", score: 2 }, b: { name: "Team B", score: 1 }, winner: "a" }] }] }),
  /* -------- events & tickets -------- */
  B("fixtures", "sport", "A list of matches, results and upcoming kickoffs, grouped by day.", {
    competition: opt(S.str()),
    round: opt(S.str()),
    items: S.arr(
      S.obj({
        home: S.str(),
        away: S.str(),
        score: opt(S.pair(S.int())),
        status: opt(S.en(["scheduled", "live", "halftime", "finished", "postponed", "cancelled"])),
        minute: opt(S.str()),
        kickoff: opt(S.date()),
        venue: opt(S.str()),
        url: opt(S.url()),
        homeLogo: opt(S.img()),
        awayLogo: opt(S.img())
      })
    )
  }, { type: "fixtures", competition: "Kategoria e Par\xEB", round: "Java 2", items: [{ home: "Iliria", away: "Kuk\xEBsi", score: [3, 1], status: "finished", kickoff: "2026-09-12T15:00:00+02:00" }] }),
  B("listing", "event", "What's on: events grouped by day, with time, place, price and where to get tickets.", {
    items: S.arr(
      S.obj({
        title: S.str(),
        start: S.date(),
        end: opt(S.date()),
        venue: opt(S.str()),
        image: opt(S.img()),
        url: opt(S.url()),
        price: opt(S.num()),
        currency: opt(S.str()),
        category: opt(S.str()),
        status: opt(S.en(["on-sale", "few-left", "sold-out", "free", "cancelled", "postponed"])),
        seller: opt(S.str("Where tickets are sold when it is not here."))
      })
    ),
    filters: opt(S.bool("Show category filters."))
  }, { type: "listing", filters: true, items: [{ title: "T\u2019Rocks Festival", start: "2026-10-10T19:00:00+02:00", venue: "Parku Olimpik, Tiran\xEB", category: "Koncert", price: 1500, currency: "ALL" }] }),
  B("event", "event", "An event: concert, match, festival, cinema, theatre.", {
    name: S.str(),
    image: opt(S.img()),
    start: S.date(),
    end: opt(S.date()),
    venue: opt(S.obj({ name: S.str(), city: opt(S.str()), address: opt(S.str()) })),
    category: opt(S.str()),
    artists: opt(S.arr(S.str())),
    priceFrom: opt(S.num()),
    currency: opt(S.str()),
    status: opt(S.en(["on-sale", "few-left", "sold-out", "free", "cancelled", "postponed"])),
    url: opt(S.url()),
    cta: opt(S.str()),
    seller: opt(S.str("Where tickets are sold when it is not here, e.g. Kookooli.")),
    salesEnd: opt(S.date("When ticket sales stop if earlier than the end, e.g. kickoff for a match.")),
    recap: opt(S.url("Shown instead of the ticket button once the event is over: the result, a recap or the event page.")),
    recapLabel: opt(S.str('Label for that link, e.g. "See the result".'))
  }, { type: "event", name: "Albania \u2013 San Marino", start: "2026-10-06T20:45:00+02:00", venue: { name: "Air Albania Stadium", city: "Tirana" }, priceFrom: 10, currency: "EUR", status: "on-sale" }),
  B("tickets", "event", "Ticket tiers to choose from.", {
    currency: opt(S.str()),
    tiers: S.arr(S.obj({ name: S.str(), price: S.num(), perks: opt(S.arr(S.str())), remaining: opt(S.int()), status: opt(S.en(["available", "few-left", "sold-out"])) })),
    url: opt(S.url("Checkout link; the chosen tier is added as ?tier=\u2026")),
    closes: opt(S.date("When sales close; after that the tiers are shown as closed."))
  }, { type: "tickets", currency: "EUR", tiers: [{ name: "Lindja", price: 10 }, { name: "VIP", price: 60, status: "few-left" }] }),
  B("venue", "event", "A venue with address, capacity and how to get there.", { name: S.str(), image: opt(S.img()), address: opt(S.str()), city: opt(S.str()), capacity: opt(S.int()), lat: opt(S.num()), lng: opt(S.num()), transport: opt(S.arr(S.str())), url: opt(S.url()) }, { type: "venue", name: "Air Albania Stadium", city: "Tirana", capacity: 22500 }),
  B("schedule", "event", "Running order: artists, sets, sessions, kickoffs.", { items: S.arr(S.obj({ time: S.str(), name: S.str(), stage: opt(S.str()), image: opt(S.img()), note: opt(S.str()) })) }, { type: "schedule", items: [{ time: "22:00", name: "Headliner", stage: "Main" }] }),
  B("zones", "event", "A venue map with selectable zones and prices.", {
    layout: opt(S.en(["stadium", "arena", "theatre", "club"])),
    currency: opt(S.str()),
    zones: S.arr(S.obj({ id: S.str("One of: north, south, east, west, vip, floor, balcony, stage-left, stage-right, or your own."), name: S.str(), price: opt(S.num()), status: opt(S.en(["available", "few-left", "sold-out"])) })),
    url: opt(S.url("Checkout link; the chosen zone is added as ?zone=\u2026"))
  }, { type: "zones", layout: "stadium", currency: "EUR", zones: [{ id: "west", name: "Per\xEBndimi", price: 25 }] })
];
var BLOCK_MAP = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));
var ALIASES = {
  markdown: "text",
  paragraph: "text",
  alert: "callout",
  stack: "group",
  grid: "group",
  row: "group",
  accordion: "faq",
  kv: "details",
  facts: "details",
  keyvalue: "details",
  kpi: "stats",
  metrics: "stats",
  graph: "chart",
  formation: "lineup",
  pitch: "lineup",
  "starting-xi": "lineup",
  score: "match",
  fixture: "match",
  game: "match",
  stats: "stats",
  "team-stats": "match-stats",
  table_standings: "standings",
  league: "standings",
  "head-to-head": "h2h",
  results: "race",
  "f1": "race",
  mma: "fight",
  boxing: "fight",
  citations: "sources",
  references: "sources",
  buttons: "actions",
  related: "suggestions",
  artist: "artists",
  performers: "artists",
  youtube: "video",
  videos: "video",
  playlist: "video",
  vote: "poll",
  prediction: "poll",
  survey: "poll",
  "whats-on": "listing",
  "events-list": "listing",
  agenda: "listing",
  calendar: "listing",
  matches: "fixtures",
  "match-list": "fixtures",
  followups: "suggestions",
  "follow-ups": "suggestions",
  cta: "actions",
  seatmap: "zones",
  "seat-map": "zones",
  lineup_artists: "schedule"
};
var COLOR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([\d\s.,%/+-]+\)|[a-z]{3,24})$/i;
var SAFE_URL = /^(https?:|mailto:|tel:|(?![a-z][a-z0-9+.-]*:)[^\s])/i;
function checkString(v, f, path, errors) {
  if (v === null || v === void 0) return void 0;
  if (typeof v === "number" || typeof v === "boolean") v = String(v);
  if (typeof v !== "string") {
    errors.push({ path, message: "expected text" });
    return void 0;
  }
  let s2 = f === "markdown" ? v : v.trim();
  if (f === "url" || f === "image") s2 = s2.replace(/[\u0000-\u0020\u007f]+/g, "");
  if ((f === "url" || f === "image") && s2) {
    if (!SAFE_URL.test(s2) && !(f === "image" && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(s2))) {
      errors.push({ path, message: "unsafe or invalid URL" });
      return void 0;
    }
  }
  if (f === "color" && s2 && !COLOR.test(s2)) {
    errors.push({ path, message: "invalid color" });
    return void 0;
  }
  if (f === "date" && s2 && Number.isNaN(Date.parse(s2)) && !/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(s2)) {
    errors.push({ path, message: "invalid date" });
    return void 0;
  }
  return s2;
}
function check(type, v, path, errors, o) {
  if (v === void 0 || v === null || v === "" && type.kind !== "string") return void 0;
  switch (type.kind) {
    case "string":
      return checkString(v, type.format, path, errors);
    case "cell":
      if (typeof v === "number" && Number.isFinite(v)) return v;
      return checkString(v, void 0, path, errors);
    case "number":
    case "integer": {
      let n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[%\s]/g, "").replace(",", ".")) : NaN;
      if (!Number.isFinite(n)) {
        errors.push({ path, message: "expected a number" });
        return void 0;
      }
      if (type.kind === "integer") n = Math.round(n);
      if (type.min !== void 0 && n < type.min) n = type.min;
      if (type.max !== void 0 && n > type.max) n = type.max;
      return n;
    }
    case "boolean":
      if (typeof v === "boolean") return v;
      if (v === "true" || v === 1 || v === "1" || v === "yes") return true;
      if (v === "false" || v === 0 || v === "0" || v === "no") return false;
      errors.push({ path, message: "expected true or false" });
      return void 0;
    case "enum": {
      const s2 = String(v).trim().toLowerCase().replace(/[\s_]+/g, "-");
      const hit = type.values.find((x) => x === s2) ?? type.values.find((x) => x.startsWith(s2) || s2.startsWith(x));
      if (!hit) {
        errors.push({ path, message: `expected one of ${type.values.join(", ")}` });
        return void 0;
      }
      return hit;
    }
    case "array": {
      const list = Array.isArray(v) ? v : [v];
      const out = [];
      const of = type.of;
      const required = of.kind === "object" && of.props ? Object.entries(of.props).filter(([, d]) => !d.optional).map(([k]) => k) : [];
      list.forEach((item, i) => {
        const p = `${path}[${i}]`;
        const before = errors.length;
        const c = of.kind === "block" ? checkBlock(item, p, errors, o) : check(of, item, p, errors, o);
        if (c === void 0) {
          if (of.kind === "cell") out.push("");
          return;
        }
        if (required.some((k) => c[k] === void 0)) {
          if (o.partial) errors.length = before;
          else if (errors.length === before) errors.push({ path: p, message: "missing required fields" });
          return;
        }
        out.push(c);
      });
      if (type.length && out.length !== type.length && !o.partial) errors.push({ path, message: `expected ${type.length} items` });
      return out;
    }
    case "object": {
      if (typeof v !== "object" || Array.isArray(v)) {
        errors.push({ path, message: "expected an object" });
        return void 0;
      }
      const src = v;
      if (!type.props || !Object.keys(type.props).length) {
        const out = {};
        for (const [k, x] of Object.entries(src)) {
          if (typeof x === "string" || typeof x === "number") out[k] = x;
          else if (typeof x === "boolean") out[k] = x ? "\u2713" : "\u2014";
        }
        return out;
      }
      return checkProps(type.props, src, path, errors, o);
    }
    case "block":
      return checkBlock(v, path, errors, o);
  }
}
function checkProps(props, src, path, errors, o) {
  const out = {};
  for (const [k, def] of Object.entries(props)) {
    const p = path ? `${path}.${k}` : k;
    const c = check(def, src[k], p, errors, o);
    if (c === void 0) {
      if (!def.optional && !o.partial && src[k] === void 0) errors.push({ path: p, message: "is required" });
      continue;
    }
    out[k] = c;
  }
  return out;
}
function checkBlock(v, path, errors, o) {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    errors.push({ path, message: "expected a block object" });
    return void 0;
  }
  const src = v;
  const raw = String(src.type ?? src.block ?? src.kind ?? "").trim().toLowerCase();
  const type = BLOCK_MAP[raw] ? raw : ALIASES[raw];
  if (!type) {
    if (!raw && o.partial) return void 0;
    errors.push({ path: `${path}.type`, message: raw ? `unknown block "${raw}"` : "missing type" });
    return o.keepUnknown ? { type: raw || "unknown" } : void 0;
  }
  const def = BLOCK_MAP[type];
  const out = checkProps({ ...COMMON, ...def.props }, src, path, errors, o);
  out.type = type;
  return out;
}
function validate(input, o = {}) {
  const errors = [];
  let v = input;
  if (typeof v === "string") {
    const fenced = /```(?:json)?\s*([\s\S]*?)(?:```|$)/i.exec(v);
    const s2 = fenced ? fenced[1] : v;
    try {
      v = JSON.parse(s2.slice(Math.max(0, s2.search(/[[{]/))));
    } catch {
      return { ok: false, doc: { blocks: [] }, errors: [{ path: "", message: "not valid JSON" }] };
    }
  }
  let list;
  let lang;
  if (Array.isArray(v)) list = v;
  else if (v && typeof v === "object" && Array.isArray(v.blocks)) {
    list = v.blocks;
    lang = typeof v.lang === "string" ? v.lang : void 0;
  } else if (v && typeof v === "object" && "type" in v) list = [v];
  else return { ok: false, doc: { blocks: [] }, errors: [{ path: "", message: "expected { blocks: [...] }" }] };
  const blocks = [];
  list.forEach((b, i) => {
    const c = checkBlock(b, `blocks[${i}]`, errors, o);
    if (c) blocks.push(c);
  });
  return { ok: errors.length === 0, doc: lang ? { blocks, lang } : { blocks }, errors };
}
function toSchema(type) {
  const base = type.desc ? { description: type.desc } : {};
  switch (type.kind) {
    case "string":
      return { ...base, type: "string", ...type.format === "url" || type.format === "image" ? { format: "uri-reference" } : type.format === "date" ? { description: (type.desc ? type.desc + " " : "") + "ISO 8601 date or date-time." } : {} };
    case "cell":
      return { ...base, type: ["string", "number"] };
    case "number":
    case "integer":
      return { ...base, type: type.kind, ...type.min !== void 0 ? { minimum: type.min } : {}, ...type.max !== void 0 ? { maximum: type.max } : {} };
    case "boolean":
      return { ...base, type: "boolean" };
    case "enum":
      return { ...base, type: "string", enum: [...type.values] };
    case "array":
      return { ...base, type: "array", items: toSchema(type.of), ...type.length ? { minItems: type.length, maxItems: type.length } : {} };
    case "object": {
      if (!type.props || !Object.keys(type.props).length) return { ...base, type: "object", additionalProperties: { type: ["string", "number"] } };
      const required = Object.entries(type.props).filter(([, d]) => !d.optional).map(([k]) => k);
      return { ...base, type: "object", properties: Object.fromEntries(Object.entries(type.props).map(([k, d]) => [k, toSchema(d)])), ...required.length ? { required } : {}, additionalProperties: false };
    }
    case "block":
      return { $ref: "#/$defs/block" };
  }
}
function blockSchema(type) {
  const def = BLOCK_MAP[type];
  const s2 = toSchema(S.obj({ type: S.en([type]), ...COMMON, ...def.props }));
  s2.properties.type = { const: type };
  s2.description = def.desc;
  return s2;
}
function jsonSchema(types = BLOCKS.map((b) => b.type)) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: { blocks: { type: "array", items: { $ref: "#/$defs/block" } }, lang: { type: "string", description: "Language of labels: en or sq." } },
    required: ["blocks"],
    $defs: { block: { oneOf: types.filter((x) => BLOCK_MAP[x]).map(blockSchema) } }
  };
}
function typeText(type, depth = 0) {
  switch (type.kind) {
    case "string":
      return type.format === "markdown" ? "md" : type.format === "url" || type.format === "image" ? "url" : type.format === "date" ? "iso-date" : type.format === "color" ? "color" : "str";
    case "cell":
      return "str|num";
    case "number":
      return "num";
    case "integer":
      return "int";
    case "boolean":
      return "bool";
    case "enum":
      return type.values.map((x) => `"${x}"`).join("|");
    case "array":
      return type.length ? `[${typeText(type.of, depth)}, ${typeText(type.of, depth)}]` : `${typeText(type.of, depth)}[]`;
    case "block":
      return "Block";
    case "object":
      if (!type.props || !Object.keys(type.props).length) return "{[attr]: str}";
      return `{ ${Object.entries(type.props).map(([k, d]) => `${k}${d.optional ? "?" : ""}: ${typeText(d, depth + 1)}`).join(", ")} }`;
  }
}
function prompt(types = BLOCKS.map((b) => b.type)) {
  const lines = [
    'You can answer with rich UI. Reply with JSON: {"blocks": [Block, ...]}. Every block has "type" and may have "title", "note" and "id".',
    'Use blocks for structured facts (scores, lineups, tables, tickets, weather, places) and "text" blocks for prose. Prefer one clear block over many. Never invent data: leave out fields you do not know.',
    'Dates are ISO 8601 with a time zone. Colors are hex. Markdown (md) allows **bold**, *italic*, [links](https://\u2026) and "- " lists.',
    ""
  ];
  for (const b of BLOCKS) {
    if (!types.includes(b.type)) continue;
    lines.push(`${b.type}: ${b.desc}`);
    lines.push(`  ${typeText(S.obj(b.props))}`);
  }
  return lines.join("\n");
}
var toolDescription = (o) => o.description ?? "Show the answer as rich UI blocks (match cards, lineups, tables, charts, tickets, weather, places\u2026) that render inline for the user. Use it whenever structured facts read better as UI than as text.";
function anthropicTool(o = {}) {
  return { name: o.name ?? "render_ui", description: toolDescription(o), input_schema: jsonSchema(o.types) };
}
function openaiTool(o = {}) {
  return { type: "function", name: o.name ?? "render_ui", description: toolDescription(o), parameters: jsonSchema(o.types) };
}

// src/ui/i18n.ts
var L = {
  en: {
    live: "Live",
    halftime: "Half-time",
    finished: "Full-time",
    final: "Final",
    rounds: "rounds",
    scheduled: "Upcoming",
    postponed: "Postponed",
    cancelled: "Cancelled",
    retired: "Retired",
    vs: "vs",
    pens: "pens",
    coach: "Coach",
    bench: "Bench",
    lineup: "Lineup",
    confirmed: "Official lineup",
    predicted: "Predicted lineup",
    captain: "Captain",
    sources: "Sources",
    verified: "Verified",
    checked: "Checked",
    buy: "Buy tickets",
    from: "from",
    soldOut: "Sold out",
    fewLeft: "Few left",
    onSale: "On sale",
    free: "Free",
    left: "left",
    choose: "Choose",
    selected: "Selected",
    continue: "Continue",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    started: "Started",
    played: "P",
    won: "W",
    drawn: "D",
    lost: "L",
    gf: "GF",
    ga: "GA",
    gd: "GD",
    points: "Pts",
    pct: "Win %",
    form: "Form",
    win: "Win",
    draw: "Draw",
    loss: "Loss",
    wins: "wins",
    draws: "draws",
    feels: "Feels like",
    humidity: "Humidity",
    wind: "Wind",
    rain: "Rain",
    capacity: "Capacity",
    directions: "Directions",
    map: "Map",
    correct: "Correct",
    wrong: "Not quite",
    score: "Score",
    next: "Next",
    showTable: "Show as table",
    showChart: "Show as chart",
    total: "Total",
    fastest: "Fastest lap",
    winner: "Winner",
    method: "Method",
    round: "Round",
    serving: "Serving",
    open: "Open",
    more: "More",
    goal: "Goal",
    penalty: "Penalty",
    "own-goal": "Own goal",
    "missed-penalty": "Missed penalty",
    yellow: "Yellow card",
    "second-yellow": "Second yellow",
    red: "Red card",
    sub: "Substitution",
    var: "VAR",
    injury: "Injury",
    period: "Period",
    reviews: "reviews",
    loading: "Loading",
    ended: "Ended",
    happening: "Happening now",
    salesClosed: "Sales closed",
    resultPending: "Result soon",
    recap: "Read the recap",
    watch: "Watch",
    play: "Play",
    listen: "Listen",
    vote: "Vote",
    votes: "votes",
    voted: "Thanks for voting",
    closes: "Closes",
    closed: "Voting closed",
    today: "Today",
    tomorrow: "Tomorrow",
    all: "All",
    info: "Info",
    ticketsAt: "Tickets at",
    profile: "Profile",
    less: "Less",
    reported: "Reported",
    unconfirmed: "Unconfirmed",
    analysis: "Analysis",
    nothing: "Nothing here right now.",
    sortBy: "Sort by",
    filterRows: "Search the table"
  },
  sq: {
    live: "Live",
    halftime: "Pushim",
    finished: "P\xEBrfundoi",
    final: "P\xEBrfundoi",
    rounds: "raunde",
    scheduled: "S\xEB shpejti",
    postponed: "E shtyr\xEB",
    cancelled: "E anuluar",
    retired: "T\xEBrhequr",
    vs: "kund\xEBr",
    pens: "penallti",
    coach: "Trajneri",
    bench: "Stoli",
    lineup: "Formacioni",
    confirmed: "XI zyrtar",
    predicted: "Formacion i parashikuar",
    captain: "Kapiteni",
    sources: "D\xEBshmit\xEB dhe burimet",
    verified: "Verifikuar",
    checked: "Kontrolluar",
    buy: "Bli bilet\xEBn",
    from: "nga",
    soldOut: "Shitur",
    fewLeft: "Pak t\xEB mbetura",
    onSale: "N\xEB shitje",
    free: "Falas",
    left: "mbetur",
    choose: "Zgjidh",
    selected: "Zgjedhur",
    continue: "Vazhdo",
    days: "d",
    hours: "o",
    minutes: "m",
    seconds: "s",
    started: "Filloi",
    played: "L",
    won: "F",
    drawn: "B",
    lost: "H",
    gf: "GS",
    ga: "GP",
    gd: "DG",
    points: "Pik\xEB",
    pct: "% fitore",
    form: "Forma",
    win: "Fitore",
    draw: "Barazim",
    loss: "Humbje",
    wins: "fitore",
    draws: "barazime",
    feels: "Ndihet si",
    humidity: "Lag\xEBshtia",
    wind: "Era",
    rain: "Shi",
    capacity: "Kapaciteti",
    directions: "Udh\xEBzime",
    map: "Harta",
    correct: "E sakt\xEB",
    wrong: "Jo tamam",
    score: "Rezultati",
    next: "Tjetra",
    showTable: "Shfaq si tabel\xEB",
    showChart: "Shfaq si grafik",
    total: "Totali",
    fastest: "Xhiro m\xEB e shpejt\xEB",
    winner: "Fituesi",
    method: "M\xEBnyra",
    round: "Raundi",
    serving: "Sh\xEBrben",
    open: "Hap",
    more: "M\xEB shum\xEB",
    goal: "Gol",
    penalty: "Penallti",
    "own-goal": "Autogol",
    "missed-penalty": "Penallti e humbur",
    yellow: "Karton i verdh\xEB",
    "second-yellow": "I dyti i verdh\xEB",
    red: "Karton i kuq",
    sub: "Z\xEBvend\xEBsim",
    var: "VAR",
    injury: "D\xEBmtim",
    period: "Periudha",
    reviews: "vler\xEBsime",
    loading: "Duke u ngarkuar",
    ended: "Ka p\xEBrfunduar",
    happening: "Po zhvillohet",
    salesClosed: "Shitja u mbyll",
    resultPending: "Rezultati s\xEB shpejti",
    recap: "Lexo kronik\xEBn",
    watch: "Shiko",
    play: "Luaj",
    listen: "D\xEBgjo",
    vote: "Voto",
    votes: "vota",
    voted: "Faleminderit p\xEBr vot\xEBn",
    closes: "Mbyllet",
    closed: "Votimi u mbyll",
    today: "Sot",
    tomorrow: "Nes\xEBr",
    all: "T\xEB gjitha",
    info: "Info",
    ticketsAt: "Biletat te",
    profile: "Profili",
    less: "M\xEB pak",
    reported: "Raportuar",
    unconfirmed: "I pakonfirmuar",
    analysis: "Analiz\xEB",
    nothing: "Asgj\xEB p\xEBr momentin.",
    sortBy: "Rendit sipas",
    filterRows: "K\xEBrko n\xEB tabel\xEB"
  }
};
function addLabels(lang, labels2) {
  L[lang] = { ...L[lang] ?? {}, ...labels2 };
}
function labels(lang = "en") {
  const base = L.en;
  const l = L[lang.slice(0, 2).toLowerCase()] ?? {};
  return (key) => l[key] ?? base[key] ?? key;
}

// src/ui/html.ts
var esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var SAFE_URL2 = /^(https?:|mailto:|tel:|(?![a-z][a-z0-9+.-]*:)[^\s])/i;
var safeUrl = (u) => {
  const s2 = String(u ?? "").replace(/[\u0000-\u0020\u007f]+/g, "");
  return SAFE_URL2.test(s2) || /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(s2) ? s2 : "";
};
var isExternal = (u) => /^https?:\/\//i.test(u);
var linkAttrs = (u) => `href="${esc(u)}"${isExternal(u) ? ' target="_blank" rel="noopener"' : ""}`;
var COLOR2 = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([\d\s.,%/+-]+\)|[a-z]{3,24})$/i;
var safeColor = (c, fallback = "") => typeof c === "string" && COLOR2.test(c.trim()) ? c.trim() : fallback;
function inline(s2) {
  return esc(s2).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
    const u = safeUrl(url.replace(/&amp;/g, "&"));
    return u ? `<a ${linkAttrs(u)}>${text}</a>` : text;
  });
}
function md(src) {
  const text = String(src ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text) return "";
  const out = [];
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk.split("\n");
    if (lines.every((l) => /^\s*>\s?/.test(l))) out.push(`<blockquote>${lines.map((l) => inline(l.replace(/^\s*>\s?/, ""))).join("<br>")}</blockquote>`);
    else if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("")}</ul>`);
    else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`);
    else if (/^#{1,4}\s/.test(lines[0])) out.push(`<h4>${inline(lines[0].replace(/^#+\s/, ""))}</h4>${lines.length > 1 ? `<p>${lines.slice(1).map(inline).join("<br>")}</p>` : ""}`);
    else out.push(`<p>${lines.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}
function parseDate(v) {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
var NAMES = {
  sq: { days: ["die", "h\xEBn", "mar", "m\xEBr", "enj", "pre", "sht"], months: ["jan", "shk", "mar", "pri", "maj", "qer", "korr", "gush", "sht", "tet", "n\xEBn", "dhj"] }
};
var supported = /* @__PURE__ */ new Map();
function hasLocale(locale) {
  if (!supported.has(locale)) {
    let ok = true;
    try {
      ok = Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
    } catch {
      ok = false;
    }
    supported.set(locale, ok);
  }
  return supported.get(locale);
}
var EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function ownFormat(names, f, d, kind, hasTime) {
  const parts = {};
  try {
    for (const p of new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: f.timeZone }).formatToParts(d)) parts[p.type] = p.value;
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
  const day = names.days[EN_DAYS.indexOf(parts.weekday)] ?? "";
  const month = names.months[Number(parts.month) - 1] ?? "";
  parts.day = String(Number(parts.day));
  const time = `${parts.hour}:${parts.minute}`;
  if (kind === "time") return time;
  if (kind === "date") return `${parts.day} ${month} ${parts.year}`;
  if (kind === "day") return `${day}, ${parts.day} ${month}`;
  if (kind === "short") return `${parts.day} ${month}`;
  if (kind === "dom") return parts.day;
  if (kind === "month") return month;
  return hasTime ? `${day}, ${parts.day} ${month}, ${time}` : `${day}, ${parts.day} ${month} ${parts.year}`;
}
function fmtDate(f, v, kind = "datetime") {
  const d = parseDate(v);
  if (!d) return esc(v);
  const hasTime = typeof v === "string" && /T\d\d:\d\d/.test(v);
  const own = NAMES[f.locale.slice(0, 2).toLowerCase()];
  if (own && !hasLocale(f.locale)) return esc(ownFormat(own, f, d, kind, hasTime));
  const o = kind === "time" ? { hour: "2-digit", minute: "2-digit", hour12: false } : kind === "date" ? { day: "numeric", month: "short", year: "numeric" } : kind === "day" ? { weekday: "short", day: "numeric", month: "short" } : kind === "short" ? { day: "numeric", month: "short" } : kind === "dom" ? { day: "numeric" } : kind === "month" ? { month: "short" } : hasTime ? { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false } : { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  try {
    return esc(new Intl.DateTimeFormat(f.locale, { ...o, timeZone: f.timeZone }).format(d));
  } catch {
    return esc(d.toISOString().slice(0, 16).replace("T", " "));
  }
}
function fmtNum(f, n, o = {}) {
  if (typeof n !== "number") return esc(n);
  try {
    return new Intl.NumberFormat(f.locale, o).format(n);
  } catch {
    return String(n);
  }
}
function money(f, n, currency = "EUR") {
  if (typeof n !== "number") return esc(n);
  try {
    return new Intl.NumberFormat(f.locale, { style: "currency", currency, maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
  } catch {
    return `${n} ${esc(currency)}`;
  }
}
var initials = (name) => String(name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
var svg = (body, cls = "") => `<svg class="fxui-i ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
var ICONS = {
  sun: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"/>', "sun"),
  night: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  partly: svg('<circle cx="8.5" cy="8.5" r="3.2"/><path d="M8.5 2.6v1.4M2.6 8.5H4M4.3 4.3l1 1M12.7 4.3l-1 1"/><path d="M8 19h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.5A2.8 2.8 0 0 0 8 19z"/>', "partly"),
  cloud: svg('<path d="M7 19h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 19z"/>'),
  rain: svg('<path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>', "rain"),
  storm: svg('<path d="M7 14h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14z"/><path d="M12.5 14.5l-2 3.5h3l-2 3.5"/>'),
  snow: svg('<path d="M7 14h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14z"/><path d="M8.5 18v.01M12 19.5v.01M15.5 18v.01M10 21.5v.01M14 21.5v.01"/>'),
  fog: svg('<path d="M4 9h16M3 13h18M5 17h14M8 21h8"/>'),
  wind: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  ticket: svg('<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2.2a2.3 2.3 0 0 0 0 4.6v2.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2.2a2.3 2.3 0 0 0 0-4.6z"/><path d="M14 6v12" stroke-dasharray="1.5 2"/>'),
  check: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  star: '<svg class="fxui-i star" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"/></svg>',
  shield: svg('<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>'),
  ball: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.6l3.3 2.4-1.3 3.9H10l-1.3-3.9zM12 3.4v4.2M15.3 10l4-1.3M14 13.9l2.5 3.4M10 13.9l-2.5 3.4M8.7 10l-4-1.3"/>'),
  swap: svg('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
  monitor: svg('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>'),
  users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 4.8a3.2 3.2 0 0 1 0 6.4M20.5 19.5a5.5 5.5 0 0 0-3.5-5.1"/>'),
  train: svg('<rect x="5" y="3.5" width="14" height="13" rx="3"/><path d="M5 11h14M8.5 20l1.5-3.5M15.5 20L14 16.5M8.5 14h.01M15.5 14h.01"/>'),
  info: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.5M12 7.8v.01"/>'),
  warn: svg('<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  play: svg('<path d="M8 5.5v13l10.5-6.5z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  table: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>'),
  spotify: svg('<circle cx="12" cy="12" r="8.6"/><path d="M7.6 9.6c3-.9 6.4-.6 9 .9M8.2 12.6c2.4-.7 5-.4 7.2.8M8.8 15.4c1.9-.5 3.8-.3 5.5.6"/>'),
  youtube: svg('<rect x="2.8" y="5.5" width="18.4" height="13" rx="3.6"/><path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor"/>'),
  instagram: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M16.9 7.1v.01"/>')
};
var icon = (name) => ICONS[name] ?? "";

// src/ui/blocks/media.ts
var arr = (v) => Array.isArray(v) ? v : [];
var YT = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
var VIMEO = /vimeo\.com\/(?:video\/)?(\d{6,12})/;
function parseVideo(url, start = 0) {
  const u = safeUrl(url);
  if (!u) return null;
  const s2 = Math.max(0, Math.floor(Number(start) || 0));
  const yt = YT.exec(u);
  if (yt) {
    const id = yt[1];
    return {
      provider: "youtube",
      id,
      watch: `https://www.youtube.com/watch?v=${id}${s2 ? `&t=${s2}s` : ""}`,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1${s2 ? `&start=${s2}` : ""}`,
      poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    };
  }
  const vm = VIMEO.exec(u);
  if (vm) {
    const id = vm[1];
    return { provider: "vimeo", id, watch: `https://vimeo.com/${id}`, embed: `https://player.vimeo.com/video/${id}?autoplay=1${s2 ? `#t=${s2}s` : ""}`, poster: "" };
  }
  return null;
}
function player(v, c) {
  const ref = parseVideo(v.url, v.start);
  const poster = safeUrl(v.poster) || ref?.poster || "";
  const href = ref?.watch ?? safeUrl(v.url);
  if (!href) return "";
  const label = `${c.t("play")}: ${v.title ?? ""}`.trim();
  return `<a class="fxui-vplayer" ${linkAttrs(href)}${ref ? ` data-embed="${esc(ref.embed)}" data-provider="${ref.provider}"` : ""} aria-label="${esc(label)}">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy">` : ""}<span class="fxui-playbtn">${icon("play")}</span><span class="fxui-vmeta">${v.title ? `<strong>${esc(v.title)}</strong>` : ""}${v.channel ? `<small>${esc(v.channel)}</small>` : ""}</span></a>`;
}
var ARTIST_LINKS = [
  ["spotify", "spotify", "Spotify"],
  ["youtube", "youtube", "YouTube"],
  ["instagram", "instagram", "Instagram"]
];
function excerpt(src) {
  const text = src.replace(/\s+/g, " ").replace(/[*_`]/g, "").trim();
  const m = /^(.{40,200}?[.!?])\s/.exec(text + " ");
  return m ? m[1] : text.length > 170 ? text.slice(0, 160).replace(/\s+\S*$/, "") + "\u2026" : text;
}
var media = {
  video: (b, c) => {
    const items = arr(b.items).length ? arr(b.items) : b.url ? [{ url: b.url, title: b.title, channel: b.channel, poster: b.poster, start: b.start }] : [];
    if (!items.length) return "";
    const main = player(items[0], c);
    if (items.length === 1) return `<div class="fxui-video" data-k="v0">${main}</div>`;
    return `<div class="fxui-video fxui-playlist"><div class="fxui-stage">${main}</div><ol class="fxui-vlist">${items.map((v, i) => {
      const ref = parseVideo(v.url, v.start);
      const poster = safeUrl(v.poster) || ref?.poster || "";
      return `<li data-k="v${i}"><button type="button" data-index="${i}" aria-current="${i === 0}">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy">` : `<span class="fxui-vthumb">${icon("play")}</span>`}<span><strong>${esc(v.title ?? "")}</strong>${v.channel ? `<small>${esc(v.channel)}</small>` : ""}</span></button></li>`;
    }).join("")}</ol><script type="application/json" class="fxui-vdata">${JSON.stringify(
      items.map((v) => {
        const ref = parseVideo(v.url, v.start);
        return { href: ref?.watch ?? safeUrl(v.url), embed: ref?.embed ?? "", poster: safeUrl(v.poster) || ref?.poster || "", title: v.title ?? "", channel: v.channel ?? "" };
      })
    ).replace(/</g, "\\u003c")}<\/script></div>`;
  },
  artists: (b, c) => {
    const list = arr(b.items);
    const one = list.length === 1;
    return `<ul class="fxui-artists${one ? " fxui-one" : ""}" role="list">${list.map((a, i) => {
      const img = safeUrl(a.image);
      const u = safeUrl(a.url);
      const name = u ? `<a ${linkAttrs(u)}>${esc(a.name)}</a>` : esc(a.name);
      const links = ARTIST_LINKS.map(([k, ico, label]) => {
        const href = safeUrl(a[k]);
        return href ? `<a class="fxui-chip" ${linkAttrs(href)} aria-label="${esc(`${label}: ${a.name}`)}">${icon(ico)}<span>${label}</span></a>` : "";
      }).join("");
      const bio = typeof a.bio === "string" && a.bio.trim() ? a.bio : "";
      const short = bio ? excerpt(bio) : "";
      return `<li data-k="a${i}"><div class="fxui-aphoto">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span>${esc(initials(a.name))}</span>`}</div><div class="fxui-abody"><strong class="fxui-name">${name}</strong>${a.role || arr(a.genres).length ? `<span class="fxui-meta">${[a.role, ...arr(a.genres)].filter(Boolean).map(esc).join(" \xB7 ")}</span>` : ""}${short ? `<p>${esc(short)}</p>` : ""}${bio && short.length < bio.replace(/\s+/g, " ").length - 5 ? `<details><summary>${esc(c.t("more"))}</summary><div class="fxui-md">${md(bio)}</div></details>` : ""}${links ? `<div class="fxui-alinks">${links}</div>` : ""}</div></li>`;
    }).join("")}</ul>`;
  },
  poll: (b, c) => {
    const opts = arr(b.options);
    const total = opts.reduce((n, o) => n + (typeof o.votes === "number" ? o.votes : 0), 0);
    const closes = Date.parse(b.closes);
    const closed = Number.isFinite(closes) && closes <= c.now;
    if (Number.isFinite(closes)) c.expire(closes);
    const name = c.uid("poll");
    const hasVotes = opts.some((o) => typeof o.votes === "number");
    return `<form class="fxui-poll" data-state="${closed ? "results" : "open"}" data-total="${total}"><fieldset${closed ? " disabled" : ""}><legend>${esc(b.question)}</legend>${opts.map((o, i) => {
      const pct = total ? Math.round((o.votes ?? 0) / total * 100) : 0;
      return `<label class="fxui-popt" data-k="o${i}" data-votes="${typeof o.votes === "number" ? o.votes : 0}" style="--p:${pct}%"><input type="radio" name="${name}" value="${i}"><span class="fxui-plabel">${esc(o.label)}</span><span class="fxui-ppct">${hasVotes ? `${pct}%` : ""}</span></label>`;
    }).join("")}</fieldset><p class="fxui-pfoot" aria-live="polite"><small>${[
      hasVotes ? `${fmtNum(c, total)} ${esc(c.t("votes"))}` : "",
      closed ? esc(c.t("closed")) : Number.isFinite(closes) ? `${esc(c.t("closes"))} ${fmtDate(c, b.closes)}` : ""
    ].filter(Boolean).join(" \xB7 ")}</small></p></form>`;
  }
};

// src/ui/blocks/content.ts
var arr2 = (v) => Array.isArray(v) ? v : [];
var TONE_ICON = { info: "info", success: "check", warning: "warn", danger: "warn", tip: "bulb" };
var content = {
  text: (b) => `<div class="fxui-md">${md(b.md)}</div>`,
  callout: (b) => {
    const tone = b.tone ?? "info";
    return `<div class="fxui-callout" data-tone="${esc(tone)}" role="note">${icon(TONE_ICON[tone] ?? "info")}<div class="fxui-md">${md(b.text)}</div></div>`;
  },
  group: (b, c) => {
    const layout = b.layout ?? "stack";
    const cols = Math.max(1, Math.min(4, b.columns ?? (layout === "row" ? arr2(b.blocks).length || 2 : 2)));
    return `<div class="fxui-group" data-layout="${esc(layout)}" style="--cols:${cols}">${c.blocks(b.blocks)}</div>`;
  },
  tabs: (b, c) => {
    const id = c.uid("tab");
    const tabs = arr2(b.tabs);
    return `<div class="fxui-tabs"><div class="fxui-tablist" role="tablist">${tabs.map((t2, i) => `<button type="button" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-k="t${i}">${esc(t2.label)}</button>`).join("")}</div>${tabs.map((t2, i) => `<div class="fxui-tabpanel" role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}"${i ? " hidden" : ""}>${c.blocks(t2.blocks)}</div>`).join("")}</div>`;
  },
  faq: (b) => `<div class="fxui-faq">${arr2(b.items).map((it, i) => `<details data-k="q${i}"><summary><span>${esc(it.q)}</span><i class="fxui-plus" aria-hidden="true"></i></summary><div class="fxui-md">${md(it.a)}</div></details>`).join("")}</div>`,
  details: (b) => `<dl class="fxui-details">${arr2(b.items).map((it, i) => {
    const u = safeUrl(it.url);
    const v = u ? `<a ${linkAttrs(u)}>${esc(it.value)}</a>` : esc(it.value);
    return `<div data-k="d${i}"><dt>${it.icon ? `<span class="fxui-emoji" aria-hidden="true">${esc(it.icon)}</span>` : ""}${esc(it.label)}</dt><dd>${v}</dd></div>`;
  }).join("")}</dl>`,
  steps: (b) => `<ol class="fxui-steps">${arr2(b.items).map((it, i) => `<li data-k="s${i}"><span class="fxui-stepn" aria-hidden="true">${i + 1}</span><div><strong>${esc(it.title)}</strong>${it.text ? `<div class="fxui-md">${md(it.text)}</div>` : ""}</div></li>`).join("")}</ol>`,
  timeline: (b) => `<ol class="fxui-timeline">${arr2(b.items).map((it, i) => `<li data-k="e${i}"><time>${esc(it.time)}</time><span class="fxui-dot" aria-hidden="true">${it.icon ? esc(it.icon) : ""}</span><div><strong>${esc(it.title)}</strong>${it.text ? `<div class="fxui-md">${md(it.text)}</div>` : ""}</div></li>`).join("")}</ol>`,
  product: (b, c) => {
    const img = safeUrl(b.image);
    const u = safeUrl(b.url);
    const stars = typeof b.rating === "number" ? `<span class="fxui-rating" aria-label="${b.rating} / 5">${icon("star")}${fmtNum(c, b.rating, { maximumFractionDigits: 1 })}${b.reviews ? ` <small>(${fmtNum(c, b.reviews)} ${esc(c.t("reviews"))})</small>` : ""}</span>` : "";
    const price = typeof b.price === "number" ? `<div class="fxui-price"><strong>${money(c, b.price, b.currency)}</strong>${typeof b.oldPrice === "number" ? `<s>${money(c, b.oldPrice, b.currency)}</s>` : ""}</div>` : "";
    return `<article class="fxui-product${img ? "" : " fxui-noimg"}">${img ? `<div class="fxui-media"><img src="${esc(img)}" alt="" loading="lazy">${b.badge ? `<mark>${esc(b.badge)}</mark>` : ""}</div>` : ""}<div class="fxui-body"><strong class="fxui-name">${esc(b.name)}</strong>${stars}${b.text ? `<div class="fxui-md">${md(b.text)}</div>` : ""}<div class="fxui-row">${price}${u ? `<a class="fxui-btn" data-variant="primary" ${linkAttrs(u)}>${esc(b.cta ?? c.t("open"))}</a>` : ""}</div></div></article>`;
  },
  gallery: (b) => `<div class="fxui-gallery">${arr2(b.images).map((im, i) => {
    const s2 = safeUrl(im.src);
    return s2 ? `<figure data-k="g${i}"><img src="${esc(s2)}" alt="${esc(im.alt)}" loading="lazy">${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ""}</figure>` : "";
  }).join("")}</div>`,
  image: (b) => {
    const s2 = safeUrl(b.src);
    return s2 ? `<figure class="fxui-figure"><img src="${esc(s2)}" alt="${esc(b.alt)}" loading="lazy">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>` : "";
  },
  quote: (b) => {
    const img = safeUrl(b.image);
    return `<figure class="fxui-quote"><blockquote>${esc(b.text)}</blockquote>${b.author ? `<figcaption>${img ? `<img src="${esc(img)}" alt="">` : `<span class="fxui-avatar">${esc(initials(b.author))}</span>`}<span><strong>${esc(b.author)}</strong>${b.role ? `<small>${esc(b.role)}</small>` : ""}</span></figcaption>` : ""}</figure>`;
  },
  places: (b, c) => `<ul class="fxui-places">${arr2(b.items).map((p, i) => {
    const img = safeUrl(p.image);
    const u = safeUrl(p.url);
    const q = typeof p.lat === "number" && typeof p.lng === "number" ? `${p.lat},${p.lng}` : [p.name, p.address].filter(Boolean).join(", ");
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    return `<li data-k="p${i}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="fxui-pin">${icon("pin")}</span>`}<div class="fxui-body"><strong>${u ? `<a ${linkAttrs(u)}>${esc(p.name)}</a>` : esc(p.name)}</strong><span class="fxui-meta">${[p.category, p.price].filter(Boolean).map(esc).join(" \xB7 ")}${typeof p.rating === "number" ? ` <span class="fxui-rating">${icon("star")}${fmtNum(c, p.rating, { maximumFractionDigits: 1 })}</span>` : ""}</span>${p.address ? `<small>${esc(p.address)}</small>` : ""}${p.note ? `<p>${esc(p.note)}</p>` : ""}</div><a class="fxui-btn" data-variant="ghost" ${linkAttrs(maps)} aria-label="${esc(c.t("directions"))}: ${esc(p.name)}">${icon("pin")}<span>${esc(c.t("map"))}</span></a></li>`;
  }).join("")}</ul>`,
  itinerary: (b) => `<div class="fxui-itinerary">${arr2(b.days).map(
    (d, i) => `<section data-k="day${i}"><h4>${esc(d.label)}</h4><ol>${arr2(d.stops).map((s2, j) => {
      const u = safeUrl(s2.url);
      return `<li data-k="day${i}s${j}">${s2.time ? `<time>${esc(s2.time)}</time>` : "<time></time>"}<span class="fxui-dot" aria-hidden="true"></span><div><strong>${u ? `<a ${linkAttrs(u)}>${esc(s2.name)}</a>` : esc(s2.name)}</strong>${s2.note ? `<p>${esc(s2.note)}</p>` : ""}</div></li>`;
    }).join("")}</ol></section>`
  ).join("")}</div>`,
  quiz: (b, c) => {
    const id = c.uid("quiz");
    return `<div class="fxui-quiz">${arr2(b.questions).map(
      (q, i) => `<fieldset data-k="q${i}" data-answer="${Number(q.answer)}"><legend>${esc(q.q)}</legend>${arr2(q.options).map((o, j) => `<label><input type="radio" name="${id}-${i}" value="${j}"><span>${esc(o)}</span></label>`).join("")}<div class="fxui-feedback" aria-live="polite" hidden><strong></strong>${q.explain ? `<div class="fxui-md">${md(q.explain)}</div>` : ""}</div></fieldset>`
    ).join("")}<p class="fxui-quizscore" aria-live="polite"></p></div>`;
  },
  actions: (b) => `<div class="fxui-actions">${arr2(b.buttons).map((x, i) => {
    const u = safeUrl(x.url);
    return u ? `<a class="fxui-btn" data-variant="${esc(x.style ?? (i ? "secondary" : "primary"))}" ${linkAttrs(u)} data-k="a${i}">${esc(x.label)}${icon("arrow")}</a>` : "";
  }).join("")}</div>`,
  suggestions: (b) => `<ul class="fxui-suggest" role="list">${arr2(b.items).map((x, i) => {
    const u = x.url ? safeUrl(x.url) : "";
    const inner = `${icon("arrow")}<span>${esc(x.text)}</span>`;
    return `<li data-k="q${i}">${u ? `<a class="fxui-ask" ${linkAttrs(u)}>${inner}</a>` : `<button type="button" class="fxui-ask" data-ask="${esc(x.text)}">${inner}</button>`}</li>`;
  }).join("")}</ul>`,
  sources: (b, c) => `<div class="fxui-sources"><div class="fxui-srchead"><strong>${esc(c.t("sources"))} (${arr2(b.items).length})</strong>${b.verified ? `<span class="fxui-badge" data-tone="good">${icon("shield")}${esc(c.t("verified"))}</span>` : ""}${b.checked ? `<small>${esc(c.t("checked"))} ${fmtDate(c, b.checked)}</small>` : ""}</div><ol>${arr2(b.items).map((s2, i) => {
    const u = safeUrl(s2.url);
    const host = u && /^https?:\/\//.test(u) ? u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : "";
    return `<li data-k="s${i}"><a ${u ? linkAttrs(u) : ""}>${esc(s2.title)}</a><small>${[s2.publisher ?? host, s2.date ? fmtDate(c, s2.date, "date") : ""].filter(Boolean).map((x) => x === s2.publisher || x === host ? esc(x) : x).join(" \xB7 ")}</small></li>`;
  }).join("")}</ol></div>`,
  countdown: (b, c) => {
    const target = Date.parse(b.to);
    const left = Math.max(0, (target || 0) - c.now);
    const parts = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
    const keys = ["days", "hours", "minutes", "seconds"];
    return `<div class="fxui-countdown" data-to="${Number.isFinite(target) ? target : ""}" role="timer"${b.label ? ` aria-label="${esc(b.label)}"` : ""}>${b.label ? `<span class="fxui-cdlabel">${esc(b.label)}</span>` : ""}<div class="fxui-cdparts">${parts.map((p, i) => `<span><b data-part="${i}">${String(p).padStart(2, "0")}</b><small>${esc(c.t(keys[i]))}</small></span>`).join("")}</div>${b.to ? `<small class="fxui-cdwhen">${fmtDate(c, b.to)}</small>` : ""}</div>`;
  }
};

// src/ui/blocks/data.ts
var arr3 = (v) => Array.isArray(v) ? v : [];
var nums = (v) => arr3(v).map((x) => typeof x === "number" && Number.isFinite(x) ? x : NaN);
function niceTicks(min, max, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s2) => s2 >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e9) / 1e9);
  return out;
}
var compact = (c, n, unit) => {
  const s2 = Math.abs(n) >= 1e4 ? fmtNum(c, n, { notation: "compact", maximumFractionDigits: 1 }) : fmtNum(c, n, { maximumFractionDigits: 2 });
  return unit === "%" ? `${s2}%` : unit ? `${s2} ${esc(unit)}` : s2;
};
function cellText(c, v, format, currency) {
  if (typeof v === "number") {
    if (format === "percent") return `${fmtNum(c, v, { maximumFractionDigits: 1 })}%`;
    if (format === "money") return money(c, v, currency);
    return fmtNum(c, v, { maximumFractionDigits: 2 });
  }
  if (format === "date") return fmtDate(c, v, "date");
  if (format === "datetime") return fmtDate(c, v, "datetime");
  return esc(v);
}
function chartTable(b, c, hidden = true) {
  const labels2 = arr3(b.labels);
  const series = arr3(b.series);
  return `<table class="fxui-table fxui-charttable"${hidden ? " hidden" : ""}><thead><tr><th></th>${series.map((s2) => `<th scope="col">${esc(s2.name)}</th>`).join("")}</tr></thead><tbody>${labels2.map((l, i) => `<tr><th scope="row">${esc(l)}</th>${series.map((s2) => `<td>${Number.isFinite(nums(s2.values)[i]) ? compact(c, nums(s2.values)[i], b.unit) : "\u2014"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
var legend = (series, shape) => series.length > 1 ? `<ul class="fxui-legend">${series.map((s2, i) => `<li><i data-shape="${shape}" style="--c:var(--fxui-s${i % 8 + 1})"></i>${esc(s2.name)}</li>`).join("")}</ul>` : "";
function lineChart(b, c) {
  const labels2 = arr3(b.labels);
  const series = arr3(b.series).slice(0, 8);
  const all = series.flatMap((s2) => nums(s2.values)).filter(Number.isFinite);
  const area = b.kind === "area";
  const ticks = niceTicks(Math.min(b.min ?? (area ? 0 : Math.min(...all)), ...area ? [0] : []), Math.max(b.max ?? -Infinity, ...all));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const n = Math.max(labels2.length, ...series.map((s2) => arr3(s2.values).length), 2);
  const X = (i) => n === 1 ? 50 : i / (n - 1) * 100;
  const Y = (v) => 100 - (v - lo) / (hi - lo || 1) * 100;
  const paths = series.map((s2, si) => {
    const vs = nums(s2.values);
    const pts = vs.map((v, i) => Number.isFinite(v) ? `${X(i).toFixed(2)},${Y(v).toFixed(2)}` : "").filter(Boolean);
    if (!pts.length) return "";
    const col = `var(--fxui-s${si + 1})`;
    const d = `M${pts.join("L")}`;
    const fill = area ? `<path d="${d}L${X(vs.length - 1).toFixed(2)},100L${X(0).toFixed(2)},100Z" fill="${col}" fill-opacity=".1" stroke="none"/>` : "";
    return `${fill}<path class="fxui-line" d="${d}" stroke="${col}" pathLength="1" vector-effect="non-scaling-stroke"/>`;
  }).join("");
  const ends = series.map((s2, si) => {
    const vs = nums(s2.values);
    let i = vs.length - 1;
    while (i >= 0 && !Number.isFinite(vs[i])) i--;
    if (i < 0) return "";
    return `<span class="fxui-end" style="left:${X(i)}%;top:${Y(vs[i])}%;--c:var(--fxui-s${si + 1})"><i></i>${series.length <= 4 ? `<b>${compact(c, vs[i], b.unit)}</b>` : ""}</span>`;
  }).join("");
  const step = Math.ceil(labels2.length / 6);
  return `<div class="fxui-plot" data-kind="line" data-n="${n}"${series.length <= 4 ? " data-labels" : ""}>
<div class="fxui-yaxis">${ticks.map((t2) => `<span style="top:${Y(t2)}%">${compact(c, t2, b.unit)}</span>`).join("")}</div>
<div class="fxui-area"><div class="fxui-grid">${ticks.map((t2) => `<i style="top:${Y(t2)}%"></i>`).join("")}</div>
<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>${ends}
<div class="fxui-cross" hidden><i></i><div class="fxui-tip" role="status"></div></div></div>
<div class="fxui-xaxis">${labels2.map((l, i) => i % step === 0 || i === labels2.length - 1 ? `<span style="left:${X(i)}%">${esc(l)}</span>` : "").join("")}</div></div>`;
}
function columnChart(b, c) {
  const labels2 = arr3(b.labels);
  const series = arr3(b.series).slice(0, 8);
  const stacked = b.kind === "stacked";
  const sums = labels2.map((_, i) => series.reduce((a, s2) => a + (Number.isFinite(nums(s2.values)[i]) ? Math.max(0, nums(s2.values)[i]) : 0), 0));
  const all = stacked ? sums : series.flatMap((s2) => nums(s2.values)).filter(Number.isFinite);
  const ticks = niceTicks(Math.min(0, b.min ?? 0), Math.max(b.max ?? -Infinity, ...all, 0));
  const hi = ticks[ticks.length - 1];
  const lo = ticks[0];
  const H = (v) => (v - Math.max(lo, 0)) / (hi - lo || 1) * 100;
  const labelTips = !stacked && series.length === 1 && labels2.length <= 10;
  const cols = labels2.map((l, i) => {
    const bars = stacked ? `<div class="fxui-stack" style="height:${H(sums[i])}%">${series.map((s2, si) => {
      const v = nums(s2.values)[i];
      return Number.isFinite(v) && v > 0 ? `<i data-tip="${esc(s2.name)}: ${compact(c, v, b.unit)}" style="flex:${v};--c:var(--fxui-s${si + 1})"></i>` : "";
    }).reverse().join("")}</div>` : series.map((s2, si) => {
      const v = nums(s2.values)[i];
      return Number.isFinite(v) ? `<i class="fxui-bar" tabindex="0" data-tip="${series.length > 1 ? esc(s2.name) + ": " : ""}${compact(c, v, b.unit)}" style="height:${H(v)}%;--c:var(--fxui-s${si + 1})">${labelTips ? `<b>${compact(c, v, b.unit)}</b>` : ""}</i>` : '<i class="fxui-bar" style="height:0"></i>';
    }).join("");
    return `<div class="fxui-col" data-k="c${i}" aria-label="${esc(l)}">${bars}</div>`;
  }).join("");
  return `<div class="fxui-plot" data-kind="column">
<div class="fxui-yaxis">${ticks.map((t2) => `<span style="top:${100 - H(t2)}%">${compact(c, t2, b.unit)}</span>`).join("")}</div>
<div class="fxui-area"><div class="fxui-grid">${ticks.map((t2) => `<i style="top:${100 - H(t2)}%"></i>`).join("")}</div><div class="fxui-cols">${cols}</div><div class="fxui-tip" role="status" hidden></div></div>
<div class="fxui-xaxis fxui-xcats">${labels2.map((l) => `<span>${esc(l)}</span>`).join("")}</div></div>`;
}
function barChart(b, c) {
  const labels2 = arr3(b.labels);
  const s2 = arr3(b.series)[0] ?? { values: [] };
  const vs = nums(s2.values);
  const max = Math.max(b.max ?? -Infinity, ...vs.filter(Number.isFinite), 0) || 1;
  return `<div class="fxui-hbars">${labels2.map((l, i) => {
    const v = vs[i];
    return `<div class="fxui-hbar" data-k="h${i}"><span>${esc(l)}</span><div><i style="width:${Number.isFinite(v) ? Math.max(0, v) / max * 100 : 0}%"></i></div><b>${Number.isFinite(v) ? compact(c, v, b.unit) : "\u2014"}</b></div>`;
  }).join("")}</div>`;
}
function donutChart(b, c) {
  const labels2 = arr3(b.labels).slice(0, 6);
  const vs = nums(arr3(b.series)[0]?.values).slice(0, 6);
  const total = vs.filter(Number.isFinite).reduce((a, v) => a + Math.max(0, v), 0) || 1;
  const R = 15.915;
  const isShare = Math.abs(total - 100) < 0.5;
  const top = vs.reduce((m, v, i) => Number.isFinite(v) && v > (vs[m] ?? -Infinity) ? i : m, 0);
  const centerLabel = isShare ? `<text x="21" y="21.6">${fmtNum(c, vs[top], { maximumFractionDigits: 0 })}%</text><text x="21" y="26" class="fxui-sub">${esc(String(labels2[top] ?? "").slice(0, 14))}</text>` : `<text x="21" y="22.4">${compact(c, total, b.unit)}</text>`;
  let acc = 0;
  const segs = vs.map((v, i) => {
    if (!Number.isFinite(v) || v <= 0) return "";
    const len = v / total * 100;
    const seg = `<circle r="${R}" cx="21" cy="21" stroke="var(--fxui-s${i + 1})" stroke-dasharray="${Math.max(0, len - 0.8).toFixed(3)} ${(100 - Math.max(0, len - 0.8)).toFixed(3)}" stroke-dashoffset="${(25 - acc).toFixed(3)}" pathLength="100"><title>${esc(labels2[i])}: ${compact(c, v, b.unit)}</title></circle>`;
    acc += len;
    return seg;
  }).join("");
  return `<div class="fxui-donut"><svg viewBox="0 0 42 42" role="img" aria-label="${esc(b.title ?? "Donut chart")}"><circle class="fxui-track" r="${R}" cx="21" cy="21"/>${segs}${centerLabel}</svg><ul class="fxui-legend" data-values>${labels2.map((l, i) => Number.isFinite(vs[i]) ? `<li><i data-shape="rect" style="--c:var(--fxui-s${i + 1})"></i>${esc(l)}<b>${fmtNum(c, vs[i] / total * 100, { maximumFractionDigits: 0 })}%</b></li>` : "").join("")}</ul></div>`;
}
var WIND_ICON = (s2) => s2 && icon(s2) || icon("cloud");
var data = {
  table: (b, c) => {
    const cols = arr3(b.columns);
    const rows = arr3(b.rows).map((r) => arr3(r));
    const sortable = b.sortable ?? rows.length >= 3;
    const filter = b.filter ?? rows.length >= 12;
    const align = (j, cell) => cols[j]?.align ?? (typeof cell === "number" || ["number", "percent", "money"].includes(cols[j]?.format) ? "right" : "left");
    const max = cols.map((col, j) => col.bar ? Math.max(0, ...rows.map((r) => typeof r[j] === "number" ? Math.abs(r[j]) : 0)) : 0);
    const key = (v, format) => typeof v === "number" ? String(v) : (format === "date" || format === "datetime") && typeof v === "string" && Number.isFinite(Date.parse(v)) ? String(Date.parse(v)) : String(v ?? "");
    const head = cols.map((col, j) => {
      const label = esc(col.label);
      return `<th scope="col" data-align="${esc(align(j, rows[0]?.[j]))}"${sortable ? ` aria-sort="none"><button type="button" class="fxui-sort" data-col="${j}" aria-label="${esc(`${c.t("sortBy")} ${col.label}`)}">${label}<i aria-hidden="true"></i></button></th>` : `>${label}</th>`}`;
    }).join("");
    const body = rows.map(
      (r, i) => `<tr data-k="r${i}" data-i="${i}"${b.highlight === i ? ' aria-current="true"' : ""}>${r.map((cell, j) => {
        const col = cols[j] ?? {};
        const text = cellText(c, cell, col.format, b.currency);
        const wrap = typeof cell === "string" && cell.length > 24 ? " data-wrap" : "";
        const sortKey = sortable ? ` data-v="${esc(key(cell, col.format))}"` : "";
        if (col.bar && typeof cell === "number" && max[j] > 0)
          return `<td data-align="right" class="fxui-barcell"${sortKey}><span class="fxui-cellbar" style="--w:${(Math.abs(cell) / max[j] * 100).toFixed(1)}" aria-hidden="true"></span><span>${text}</span></td>`;
        return `<td data-align="${esc(align(j, cell))}"${wrap}${sortKey}>${text}</td>`;
      }).join("")}</tr>`
    ).join("");
    const search = filter ? `<label class="fxui-tfilter">${icon("search")}<input type="search" placeholder="${esc(c.t("filterRows"))}" aria-label="${esc(c.t("filterRows"))}"></label>` : "";
    return `<div class="fxui-tablewrap"${sortable ? " data-sortable" : ""}>${search}<div class="fxui-scroll"><table class="fxui-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${filter ? `<p class="fxui-tempty" hidden>${esc(c.t("nothing"))}</p>` : ""}</div>`;
  },
  stats: (b, c) => `<div class="fxui-stats">${arr3(b.items).map((s2, i) => {
    const up = typeof s2.delta === "number" && s2.delta > 0;
    const good = typeof s2.delta === "number" ? s2.good === "down" ? !up : up : null;
    const tr = nums(s2.trend).filter(Number.isFinite);
    let spark = "";
    if (tr.length > 1) {
      const mn = Math.min(...tr);
      const mx = Math.max(...tr);
      const pts = tr.map((v, k) => `${(k / (tr.length - 1) * 100).toFixed(1)},${(28 - (v - mn) / (mx - mn || 1) * 24).toFixed(1)}`);
      spark = `<svg class="fxui-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(" ")}" vector-effect="non-scaling-stroke"/></svg>`;
    }
    const val = typeof s2.value === "number" ? `<span data-count="${s2.value}">${compact(c, s2.value)}</span>` : esc(s2.value);
    return `<div class="fxui-stat" data-k="s${i}"><span class="fxui-statlabel">${esc(s2.label)}</span><strong>${val}${s2.unit ? `<small>${esc(s2.unit)}</small>` : ""}</strong>${typeof s2.delta === "number" ? `<span class="fxui-delta" data-good="${good}">${icon(up ? "up" : "down")}${up ? "+" : ""}${fmtNum(c, s2.delta, { maximumFractionDigits: 1 })}%${s2.period ? ` <small>${esc(s2.period)}</small>` : ""}</span>` : ""}${spark}</div>`;
  }).join("")}</div>`,
  chart: (b, c) => {
    const kind = b.kind ?? "line";
    const plot = kind === "donut" ? donutChart(b, c) : kind === "bar" ? barChart(b, c) : kind === "column" || kind === "stacked" ? columnChart(b, c) : lineChart(b, c);
    const shape = kind === "line" ? "line" : "rect";
    return `<div class="fxui-chart" data-kind="${esc(kind)}">${kind === "donut" || kind === "bar" ? "" : legend(arr3(b.series), shape)}${plot}${chartTable(b, c)}<button type="button" class="fxui-link fxui-tabletoggle" data-a="${esc(c.t("showTable"))}" data-b="${esc(c.t("showChart"))}">${icon("table")}<span>${esc(c.t("showTable"))}</span></button></div>`;
  },
  progress: (b, c) => `<div class="fxui-progress">${arr3(b.items).map((p, i) => {
    const max = typeof p.max === "number" && p.max > 0 ? p.max : 100;
    const pct = Math.max(0, Math.min(100, Number(p.value) / max * 100));
    return `<div data-k="p${i}"><div class="fxui-row"><span>${esc(p.label)}</span><b>${max === 100 ? `${fmtNum(c, p.value, { maximumFractionDigits: 1 })}%` : `${fmtNum(c, p.value)} / ${fmtNum(c, max)}`}</b></div><div class="fxui-meter" data-tone="${esc(p.tone ?? "accent")}" role="progressbar" aria-valuenow="${Number(p.value)}" aria-valuemin="0" aria-valuemax="${max}" aria-label="${esc(p.label)}"><i style="width:${pct}%"></i></div></div>`;
  }).join("")}</div>`,
  compare: (b) => {
    const items = arr3(b.items);
    const attrs = arr3(b.attributes).length ? arr3(b.attributes) : [...new Set(items.flatMap((it) => Object.keys(it.values ?? {})))];
    return `<div class="fxui-scroll"><table class="fxui-compare"><thead><tr><th></th>${items.map((it, i) => {
      const img = safeUrl(it.image);
      return `<th scope="col" data-k="c${i}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ""}${it.badge ? `<mark>${esc(it.badge)}</mark>` : ""}<strong>${esc(it.name)}</strong>${it.price ? `<span class="fxui-price">${esc(it.price)}</span>` : ""}</th>`;
    }).join("")}</tr></thead><tbody>${attrs.map((a) => `<tr><th scope="row">${esc(a)}</th>${items.map((it) => `<td>${esc(it.values?.[a] ?? "\u2014")}</td>`).join("")}</tr>`).join("")}${items.some((it) => safeUrl(it.url)) ? `<tr><th></th>${items.map((it) => safeUrl(it.url) ? `<td><a class="fxui-btn" data-variant="secondary" ${linkAttrs(safeUrl(it.url))}>${icon("arrow")}</a></td>` : "<td></td>").join("")}</tr>` : ""}</tbody></table></div>`;
  },
  weather: (b, c) => {
    const u = b.units === "f" ? "\xB0F" : "\xB0";
    const now = b.now ?? {};
    const days = arr3(b.days);
    const lo = Math.min(...days.map((d) => d.lo).filter((x) => typeof x === "number"));
    const hi = Math.max(...days.map((d) => d.hi).filter((x) => typeof x === "number"));
    return `<div class="fxui-weather" data-sky="${esc(now.icon ?? "cloud")}"><div class="fxui-now"><div><span class="fxui-loc">${icon("pin")}${esc(b.location)}</span><strong>${typeof now.temp === "number" ? Math.round(now.temp) + u : "\u2014"}</strong><span>${esc(now.condition)}</span></div><span class="fxui-sky">${WIND_ICON(now.icon)}</span></div><div class="fxui-wmeta">${typeof now.feels === "number" ? `<span>${esc(c.t("feels"))} <b>${Math.round(now.feels)}${u}</b></span>` : ""}${typeof now.humidity === "number" ? `<span>${esc(c.t("humidity"))} <b>${Math.round(now.humidity)}%</b></span>` : ""}${now.wind ? `<span>${esc(c.t("wind"))} <b>${esc(now.wind)}</b></span>` : ""}</div>${arr3(b.hours).length ? `<ol class="fxui-hours">${arr3(b.hours).map((h, i) => `<li data-k="h${i}"><small>${esc(h.time)}</small>${WIND_ICON(h.icon)}<b>${typeof h.temp === "number" ? Math.round(h.temp) + u : ""}</b>${typeof h.rain === "number" && h.rain > 0 ? `<small class="fxui-rain">${Math.round(h.rain)}%</small>` : ""}</li>`).join("")}</ol>` : ""}${days.length ? `<ol class="fxui-days">${days.map((d, i) => {
      const l = (d.lo - lo) / (hi - lo || 1) * 100;
      const r = (d.hi - lo) / (hi - lo || 1) * 100;
      return `<li data-k="d${i}"><span>${esc(d.day)}</span>${WIND_ICON(d.icon)}<small class="fxui-rain">${typeof d.rain === "number" && d.rain > 0 ? Math.round(d.rain) + "%" : ""}</small><span class="fxui-lo">${Math.round(d.lo)}${u}</span><span class="fxui-range"><i style="left:${l}%;right:${100 - r}%"></i></span><span class="fxui-hi">${Math.round(d.hi)}${u}</span></li>`;
    }).join("")}</ol>` : ""}</div>`;
  }
};

// src/ui/blocks/sport.ts
var arr4 = (v) => Array.isArray(v) ? v : [];
var flag = (cc) => typeof cc === "string" && /^[a-z]{2}$/i.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 127397 + ch.charCodeAt(0))) : "";
function crest(team, size = "m") {
  const logo = safeUrl(team?.logo);
  const col = safeColor(team?.color, "var(--fxui-line)");
  return logo ? `<span class="fxui-crest" data-size="${size}"><img src="${esc(logo)}" alt="" loading="lazy"></span>` : `<span class="fxui-crest" data-size="${size}" style="--c:${col}"><b>${esc((team?.short ?? initials(team?.name)).slice(0, 3))}</b></span>`;
}
function statusBadge(c, status, minute, kickoff, football = false) {
  if (status === "live") return `<span class="fxui-status" data-s="live"><i></i>${esc(minute || c.t("live"))}</span>`;
  if (status === "halftime") return `<span class="fxui-status" data-s="ht">${esc(c.t("halftime"))}</span>`;
  if (status === "finished") return `<span class="fxui-status" data-s="ft">${esc(c.t(football ? "finished" : "final"))}</span>`;
  if (status === "postponed" || status === "cancelled" || status === "retired") return `<span class="fxui-status" data-s="off">${esc(c.t(status))}</span>`;
  return kickoff ? `<span class="fxui-status" data-s="pre">${fmtDate(c, kickoff, "day")}</span>` : `<span class="fxui-status" data-s="pre">${esc(c.t("scheduled"))}</span>`;
}
var FORM = { W: "win", D: "draw", L: "loss", F: "win", B: "draw", H: "loss" };
function form(c, s2) {
  const letters = String(s2 ?? "").toUpperCase().replace(/[^WDLFBH]/g, "").slice(-5).split("");
  if (!letters.length) return "";
  return `<span class="fxui-form">${letters.map((l) => `<i data-r="${FORM[l]}" title="${esc(c.t(FORM[l]))}">${esc(l)}</i>`).join("")}</span>`;
}
var POS_LINE = { GK: 0, G: 0, DF: 1, D: 1, CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, MF: 2, M: 2, CM: 2, DM: 2, CDM: 2, AM: 2, CAM: 2, LM: 2, RM: 2, FW: 3, F: 3, ST: 3, CF: 3, LW: 3, RW: 3, A: 3 };
function formationLines(formation, players2) {
  const out = 0 + Math.max(0, players2.length - 1);
  const f = String(formation ?? "").split(/[^0-9]+/).map(Number).filter((n) => n > 0);
  if (f.length && f.reduce((a, b) => a + b, 0) === out) return f;
  const counts = [0, 0, 0];
  players2.slice(1).forEach((p) => {
    const l = POS_LINE[String(p.pos ?? "").toUpperCase()];
    if (l) counts[l - 1]++;
  });
  if (counts.reduce((a, b) => a + b, 0) === out && out > 0) return counts.filter((n) => n > 0);
  if (f.length) return f;
  if (out === 10) return [4, 4, 2];
  return out > 0 ? [out] : [];
}
function placePlayers(players2, formation, half = "full", expected = 11) {
  const lines = formationLines(formation, players2.length >= expected ? players2 : [...players2, ...Array(Math.max(0, expected - players2.length)).fill({})]);
  const pos = [];
  const yRange = half === "full" ? [90, 17] : [92, 58];
  pos.push({ x: 50, y: yRange[0] });
  const L2 = lines.length;
  lines.forEach((m, k) => {
    const y = L2 === 1 ? (yRange[0] + yRange[1]) / 2 : yRange[0] - 16 + (yRange[1] - (yRange[0] - 16)) * k / (L2 - 1);
    for (let j = 0; j < m; j++) pos.push({ x: (j + 1) * 100 / (m + 1), y });
  });
  return players2.map((p, i) => {
    let { x, y } = pos[i] ?? { x: 50, y: 50 };
    if (typeof p.x === "number") x = p.x;
    if (typeof p.y === "number") y = p.y;
    if (half === "top") {
      x = 100 - x;
      y = 100 - y;
    }
    return { x, y };
  });
}
function shirt(kit, color) {
  const body = safeColor(kit?.shirt, color);
  const sleeves = safeColor(kit?.sleeves, body);
  return `<svg class="fxui-shirt" viewBox="0 0 40 36" aria-hidden="true"><path d="M13 2l-9 4-4 9 7 3 2-4v20h22V14l2 4 7-3-4-9-9-4c-1 3-4 5-7 5s-6-2-7-5z" fill="${body}"/><path d="M13 2l-9 4-4 9 7 3 2-4V8.5C11 7 12 4.6 13 2zM27 2l9 4 4 9-7 3-2-4V8.5C29 7 28 4.6 27 2z" fill="${sleeves}"/><path d="M13 2c1 3 4 5 7 5s6-2 7-5" fill="none" stroke="rgb(0 0 0/.25)" stroke-width="1.2"/></svg>`;
}
function players(list, team, formation, half, c, side) {
  const color = safeColor(team?.color, safeColor(team?.kit?.shirt, "var(--fxui-s1)"));
  const numCol = safeColor(team?.kit?.number, "#fff");
  const at = placePlayers(list, formation, half);
  return list.map((p, i) => {
    const { x, y } = at[i];
    const gk = i === 0 && (!p.pos || /^G/i.test(p.pos));
    const kit = gk ? { shirt: team?.kit?.gk ?? "#2f3542", sleeves: team?.kit?.gk ?? "#2f3542" } : team?.kit;
    return `<div class="fxui-player" data-k="${side}${i}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--i:${i}" title="${esc([p.name, p.pos].filter(Boolean).join(" \xB7 "))}"><span class="fxui-kit">${shirt(kit, color)}<b style="color:${gk ? "#fff" : numCol}">${esc(p.number ?? "")}</b>${p.captain ? `<em title="${esc(c.t("captain"))}">C</em>` : ""}${typeof p.rating === "number" ? `<u data-good="${p.rating >= 7}">${fmtNum(c, p.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</u>` : ""}</span><span class="fxui-pname">${esc(String(p.name ?? "").split(" ").slice(-1)[0])}</span></div>`;
  }).join("");
}
var PITCH = `<svg class="fxui-lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="64" height="101"/><path d="M2 52.5h64"/><circle cx="34" cy="52.5" r="9.15"/><circle cx="34" cy="52.5" r=".5" class="fxui-spot"/><rect x="13.85" y="2" width="40.3" height="16.5"/><rect x="24.85" y="2" width="18.3" height="5.5"/><rect x="13.85" y="86.5" width="40.3" height="16.5"/><rect x="24.85" y="97.5" width="18.3" height="5.5"/><path d="M26.7 18.5a9.15 9.15 0 0 0 14.6 0M26.7 86.5a9.15 9.15 0 0 1 14.6 0"/></svg>`;
function eventIcon(type) {
  if (type === "goal" || type === "penalty" || type === "own-goal") return `<span class="fxui-ev" data-t="goal">${icon("ball")}</span>`;
  if (type === "missed-penalty") return `<span class="fxui-ev" data-t="miss">${icon("x")}</span>`;
  if (type === "yellow") return '<span class="fxui-ev" data-t="card"><i class="fxui-card" data-c="yellow"></i></span>';
  if (type === "second-yellow") return '<span class="fxui-ev" data-t="card"><i class="fxui-card" data-c="yellow"></i><i class="fxui-card" data-c="red"></i></span>';
  if (type === "red") return '<span class="fxui-ev" data-t="card"><i class="fxui-card" data-c="red"></i></span>';
  if (type === "sub") return `<span class="fxui-ev" data-t="sub">${icon("swap")}</span>`;
  if (type === "var") return `<span class="fxui-ev" data-t="var">${icon("monitor")}</span>`;
  return `<span class="fxui-ev">${icon("info")}</span>`;
}
var STATUS_SCORE = (s2) => s2 === "live" || s2 === "halftime" || s2 === "finished";
var sport = {
  match: (b, c) => {
    const home = b.home ?? {};
    const away = b.away ?? {};
    const score = arr4(b.score);
    const showScore = score.length === 2 && (STATUS_SCORE(b.status) || !b.kickoff);
    const center = showScore ? `<div class="fxui-score" aria-label="${esc(c.t("score"))}"><b data-k="sh">${score[0]}</b><span>\u2013</span><b data-k="sa">${score[1]}</b>${arr4(b.penalties).length === 2 ? `<small>(${b.penalties[0]}\u2013${b.penalties[1]} ${esc(c.t("pens"))})</small>` : ""}</div>` : `<div class="fxui-kick">${b.kickoff ? `<b>${fmtDate(c, b.kickoff, "time")}</b><small>${fmtDate(c, b.kickoff, "day")}</small>` : `<b>${esc(c.t("vs"))}</b>`}</div>`;
    const sc = (side) => arr4(b.scorers).filter((s2) => s2.team === side).map((s2) => `<li>${esc(s2.player)} <span>${esc(s2.minute)}${s2.type === "penalty" ? " (P)" : s2.type === "own-goal" ? " (OG)" : ""}</span></li>`).join("");
    const ko = Date.parse(b.kickoff);
    const waiting = (!b.status || b.status === "scheduled") && Number.isFinite(ko);
    if (waiting) c.expire(ko);
    const started = waiting && ko <= c.now;
    const page = safeUrl(b.url);
    const tickets = started ? "" : safeUrl(b.tickets);
    const meta = [b.venue ? `${icon("pin")}${esc(b.venue)}` : "", b.kickoff && showScore ? `${icon("calendar")}${fmtDate(c, b.kickoff)}` : "", b.tv ? `${icon("monitor")}${esc(b.tv)}` : ""].filter(Boolean);
    const badge = started ? `<span class="fxui-status" data-s="pre">${esc(c.t("resultPending"))}</span>` : statusBadge(c, b.status, b.minute, b.kickoff, !b.sport || /football|soccer|futboll/i.test(b.sport));
    const link = page && (started || STATUS_SCORE(b.status)) ? `<a class="fxui-btn" data-variant="secondary" ${linkAttrs(page)}>${esc(c.t("open"))}${icon("arrow")}</a>` : "";
    return `<div class="fxui-match" data-status="${esc(started ? "pending" : b.status ?? "scheduled")}"><div class="fxui-matchhead"><span>${esc([b.competition, b.round].filter(Boolean).join(" \xB7 "))}</span>${badge}</div><div class="fxui-teams"><div class="fxui-team">${crest(home, "l")}<strong>${esc(home.name)}</strong>${form(c, home.form)}</div>${center}<div class="fxui-team">${crest(away, "l")}<strong>${esc(away.name)}</strong>${form(c, away.form)}</div></div>${arr4(b.scorers).length ? `<div class="fxui-scorers"><ul>${sc("home")}</ul>${icon("ball")}<ul>${sc("away")}</ul></div>` : ""}${meta.length || tickets || link ? `<div class="fxui-matchfoot"><span class="fxui-meta">${meta.map((m) => `<span>${m}</span>`).join("")}</span>${tickets ? `<a class="fxui-btn" data-variant="primary" ${linkAttrs(tickets)}>${icon("ticket")}${esc(c.t("buy"))}</a>` : link}</div>` : ""}</div>`;
  },
  fixtures: (b, c) => {
    const items = arr4(b.items);
    const timed = items.some((x) => Number.isFinite(Date.parse(x.kickoff)));
    const groups = /* @__PURE__ */ new Map();
    for (const x of items) {
      const k = timed && Number.isFinite(Date.parse(x.kickoff)) ? String(x.kickoff).slice(0, 10) : "";
      groups.set(k, [...groups.get(k) ?? [], x]);
    }
    let n = 0;
    const head = [b.competition, b.round].filter(Boolean).map(esc).join(" \xB7 ");
    return `<div class="fxui-fixtures">${head ? `<div class="fxui-matchhead"><span>${head}</span></div>` : ""}${Array.from(groups.entries()).map(
      ([k, list]) => `<section>${k ? `<h4>${fmtDate(c, list[0].kickoff, "day")}</h4>` : ""}<ul role="list">${list.map((x) => {
        const ko = Date.parse(x.kickoff);
        const waiting = (!x.status || x.status === "scheduled") && Number.isFinite(ko);
        if (waiting) c.expire(ko);
        const pending = waiting && ko <= c.now;
        const sc = arr4(x.score);
        const has = sc.length === 2 && (STATUS_SCORE(x.status) || !waiting);
        const hw = has && sc[0] > sc[1];
        const aw = has && sc[1] > sc[0];
        const mid = has ? `<b class="fxui-fscore"><span data-k="h${n}">${sc[0]}</span>\u2013<span data-k="a${n}">${sc[1]}</span></b>` : pending ? `<b class="fxui-fscore" data-pending>${esc(c.t("resultPending"))}</b>` : `<b class="fxui-fscore" data-time>${Number.isFinite(ko) ? fmtDate(c, x.kickoff, "time") : esc(c.t("vs"))}</b>`;
        const u = safeUrl(x.url);
        const live = x.status === "live" || x.status === "halftime" ? `<span class="fxui-badge" data-tone="live"><i class="fxui-pulse"></i>${esc(x.status === "halftime" ? c.t("halftime") : x.minute ? `${x.minute}` : c.t("live"))}</span>` : "";
        const logo = (l, name) => safeUrl(l) ? crest({ name, logo: l }, "s") : "";
        const row = `<span class="fxui-fteam" data-win="${hw}">${logo(x.homeLogo, x.home)}<span>${esc(x.home)}</span></span>${mid}<span class="fxui-fteam" data-win="${aw}"><span>${esc(x.away)}</span>${logo(x.awayLogo, x.away)}</span>`;
        return `<li data-k="f${n++}" data-status="${esc(pending ? "pending" : x.status ?? "scheduled")}">${u ? `<a class="fxui-frow" ${linkAttrs(u)}>${row}</a>` : `<div class="fxui-frow">${row}</div>`}${live}</li>`;
      }).join("")}</ul></section>`
    ).join("")}</div>`;
  },
  lineup: (b, c) => {
    const list = arr4(b.players);
    const opp = b.opponent;
    const both = opp && arr4(opp.players).length > 0;
    const src = b.source && safeUrl(b.source.url);
    const head = `<div class="fxui-lineuphead"><span><strong>${esc(b.team?.name ?? "")}</strong>${b.formation ? ` <span class="fxui-chip">${esc(b.formation)}</span>` : ""}</span><span class="fxui-meta">${b.confirmed === false ? esc(c.t("predicted")) : `${esc(c.t("confirmed"))} (${Math.min(list.length, 11)}/11)`}${src ? ` \xB7 <a ${linkAttrs(src)}>${esc(b.source.label)}</a>` : ""}</span></div>`;
    const pitch = `<div class="fxui-pitch${both ? " fxui-both" : ""}">${PITCH}${players(list, b.team, b.formation, both ? "bottom" : "full", c, "h")}${both ? players(arr4(opp.players), opp.team, opp.formation, "top", c, "a") : ""}</div>`;
    const bench = arr4(b.bench);
    const foot = b.coach || bench.length ? `<div class="fxui-lineupfoot">${b.coach ? `<div><small>${esc(c.t("coach"))}</small><strong>${esc(b.coach)}</strong></div>` : ""}${bench.length ? `<div><small>${esc(c.t("bench"))}</small><ul>${bench.map((p, i) => `<li data-k="b${i}">${p.number !== void 0 ? `<b>${esc(p.number)}</b>` : ""}${esc(p.name)}${p.pos ? ` <span>${esc(p.pos)}</span>` : ""}</li>`).join("")}</ul></div>` : ""}</div>` : "";
    return `<div class="fxui-lineup">${head}${both ? `<div class="fxui-oppname"><strong>${esc(opp.team?.name ?? "")}</strong>${opp.formation ? ` <span class="fxui-chip">${esc(opp.formation)}</span>` : ""}</div>` : ""}${pitch}${foot}</div>`;
  },
  events: (b, c) => `<ol class="fxui-events">${b.home || b.away ? `<li class="fxui-evhead"><strong>${esc(b.home ?? "")}</strong><span></span><strong>${esc(b.away ?? "")}</strong></li>` : ""}${arr4(b.items).map((e, i) => {
    if (e.type === "period") return `<li class="fxui-period" data-k="e${i}"><span>${esc(e.note ?? e.minute)}${e.score ? ` \xB7 ${esc(e.score)}` : ""}</span></li>`;
    const who = e.type === "sub" ? `<span class="fxui-in">${icon("up")}${esc(e.in ?? e.player ?? "")}</span><span class="fxui-out">${icon("down")}${esc(e.out ?? "")}</span>` : `<strong>${esc(e.player ?? "")}</strong>${e.assist ? `<small>${esc(e.assist)}</small>` : ""}${e.note ? `<small>${esc(e.note)}</small>` : ""}`;
    const body = `<div class="fxui-evbody" title="${esc(c.t(e.type))}">${eventIcon(e.type)}<span>${who}</span>${e.score ? `<b class="fxui-evscore">${esc(e.score)}</b>` : ""}</div>`;
    return `<li data-k="e${i}" data-side="${esc(e.team ?? "home")}" data-t="${esc(e.type)}">${e.team === "away" ? "<div></div>" : body}<time>${esc(e.minute)}</time>${e.team === "away" ? body : "<div></div>"}</li>`;
  }).join("")}</ol>`,
  "match-stats": (b, c) => {
    const hc = safeColor(b.homeColor, "var(--fxui-s1)");
    const ac = safeColor(b.awayColor, "var(--fxui-s2)");
    return `<div class="fxui-mstats" style="--h:${hc};--a:${ac}"><div class="fxui-mshead"><strong>${esc(b.home)}</strong><strong>${esc(b.away)}</strong></div>${arr4(b.items).map((s2, i) => {
      const h = Number(s2.home) || 0;
      const a = Number(s2.away) || 0;
      const tot = h + a || 1;
      const u = s2.unit ? esc(s2.unit) : "";
      return `<div class="fxui-msrow" data-k="m${i}"><div class="fxui-row"><b data-win="${h > a}">${fmtNum(c, h)}${u}</b><span>${esc(s2.label)}</span><b data-win="${a > h}">${fmtNum(c, a)}${u}</b></div><div class="fxui-msbars"><i style="width:${h / tot * 100}%"></i><i style="width:${a / tot * 100}%"></i></div></div>`;
    }).join("")}</div>`;
  },
  standings: (b, c) => {
    const rows = arr4(b.rows);
    const COLS = [
      ["played", "played"],
      ["won", "won"],
      ["drawn", "drawn"],
      ["lost", "lost"],
      ["gf", "gf"],
      ["ga", "ga"],
      ["gd", "gd"],
      ["pct", "pct"],
      ["points", "points"]
    ];
    const cols = COLS.filter(([k]) => rows.some((r) => r[k] !== void 0));
    const zones = [...new Set(rows.map((r) => r.zone).filter(Boolean))];
    const hl = String(b.highlight ?? "").toLowerCase();
    return `<div class="fxui-scroll">${b.group ? `<div class="fxui-chip">${esc(b.group)}</div>` : ""}<table class="fxui-table fxui-standings"><thead><tr><th scope="col">#</th><th scope="col" data-align="left"></th>${cols.map(([k, l]) => `<th scope="col" data-align="right"${k === "points" ? " data-strong" : ""}>${esc(c.t(l))}</th>`).join("")}${rows.some((r) => r.form) ? `<th scope="col">${esc(c.t("form"))}</th>` : ""}</tr></thead><tbody>${rows.map((r, i) => {
      const logo = safeUrl(r.logo);
      return `<tr data-k="r${i}"${r.zone ? ` data-zone="${esc(r.zone)}"` : ""}${hl && String(r.team).toLowerCase() === hl ? ' aria-current="true"' : ""}><td class="fxui-pos">${esc(r.pos)}</td><td data-align="left"><span class="fxui-teamcell">${logo ? `<img src="${esc(logo)}" alt="">` : ""}${esc(r.team)}</span></td>${cols.map(([k]) => `<td data-align="right"${k === "points" ? " data-strong" : ""}>${r[k] === void 0 ? "" : k === "pct" ? fmtNum(c, r[k], { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/^0/, "") : k === "gd" && r[k] > 0 ? `+${r[k]}` : fmtNum(c, r[k])}</td>`).join("")}${rows.some((x) => x.form) ? `<td>${form(c, r.form)}</td>` : ""}</tr>`;
    }).join("")}</tbody></table>${zones.length ? `<ul class="fxui-zones">${zones.map((z) => `<li data-zone="${esc(z)}"><i></i>${esc(z.charAt(0).toUpperCase() + z.slice(1))}</li>`).join("")}</ul>` : ""}</div>`;
  },
  h2h: (b, c) => {
    const s2 = b.summary;
    const tot = s2 ? s2.home + s2.draw + s2.away || 1 : 1;
    return `<div class="fxui-h2h">${s2 ? `<div class="fxui-h2hsum"><div class="fxui-row"><span><b>${s2.home}</b> ${esc(b.home)}</span><span><b>${s2.draw}</b> ${esc(c.t("draws"))}</span><span>${esc(b.away)} <b>${s2.away}</b></span></div><div class="fxui-split"><i style="flex:${s2.home / tot}" data-c="h"></i><i style="flex:${s2.draw / tot}" data-c="d"></i><i style="flex:${s2.away / tot}" data-c="a"></i></div></div>` : ""}<ol>${arr4(b.matches).map((m, i) => {
      const [x, y] = String(m.score ?? "").split(/[-–:]/).map((n) => parseInt(n, 10));
      return `<li data-k="m${i}"><time>${fmtDate(c, m.date, "date")}</time><span${x > y ? " data-win" : ""}>${esc(m.home)}</span><b>${esc(m.score)}</b><span${y > x ? " data-win" : ""}>${esc(m.away)}</span>${m.competition ? `<small>${esc(m.competition)}</small>` : ""}</li>`;
    }).join("")}</ol></div>`;
  },
  player: (b, c) => {
    const img = safeUrl(b.image);
    return `<article class="fxui-playercard"><div class="fxui-photo">${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(initials(b.name))}</span>`}${b.number !== void 0 ? `<b>${esc(b.number)}</b>` : ""}</div><div class="fxui-body"><strong class="fxui-name">${esc(b.name)}</strong><span class="fxui-meta">${[b.position, b.team, b.nationality, b.age ? `${b.age}` : ""].filter(Boolean).map(esc).join(" \xB7 ")}</span>${arr4(b.stats).length ? `<dl class="fxui-pstats">${arr4(b.stats).map((s2, i) => `<div data-k="s${i}"><dd>${typeof s2.value === "number" ? fmtNum(c, s2.value, { maximumFractionDigits: 2 }) : esc(s2.value)}</dd><dt>${esc(s2.label)}</dt></div>`).join("")}</dl>` : ""}${b.bio ? `<div class="fxui-md fxui-bio">${md(b.bio)}</div>` : ""}</div></article>`;
  },
  scoreboard: (b, c) => {
    const tot = arr4(b.total);
    const per = arr4(b.periods);
    const leaders = arr4(b.leaders);
    return `<div class="fxui-scoreboard" data-status="${esc(b.status ?? "scheduled")}"><div class="fxui-matchhead"><span>${esc([b.competition, b.sport].filter(Boolean).join(" \xB7 "))}</span>${statusBadge(c, b.status, b.clock)}</div><table class="fxui-table fxui-sbt"><thead><tr><th></th>${per.map((p) => `<th scope="col" data-align="center">${esc(p.label)}</th>`).join("")}<th scope="col" data-align="center" data-strong>${esc(c.t("total"))}</th></tr></thead><tbody>${["home", "away"].map((side, k) => {
      const t2 = b[side] ?? {};
      const win = tot.length === 2 && b.status === "finished" && Number(tot[k]) > Number(tot[1 - k]);
      return `<tr${win ? " data-win" : ""}><th scope="row"><span class="fxui-teamcell">${crest(t2, "s")}${esc(t2.name)}</span></th>${per.map((p) => `<td data-align="center">${esc(p[side] ?? "")}</td>`).join("")}<td data-align="center" data-strong>${esc(tot[k] ?? "")}</td></tr>`;
    }).join("")}</tbody></table>${leaders.length ? `<ul class="fxui-leaders">${leaders.map((l, i) => `<li data-k="l${i}"><span>${esc((b[l.team] ?? {}).short ?? (b[l.team] ?? {}).name ?? "")}</span><strong>${esc(l.player)}</strong><small>${esc(l.stat)}</small></li>`).join("")}</ul>` : ""}</div>`;
  },
  tennis: (b, c) => {
    const ps = arr4(b.players);
    const sets = arr4(b.sets);
    const pts = arr4(b.points);
    const setsWon = [0, 0];
    sets.forEach((s2, i) => {
      if (b.status === "live" && i === sets.length - 1) return;
      if (s2.a > s2.b) setsWon[0]++;
      else if (s2.b > s2.a) setsWon[1]++;
    });
    return `<div class="fxui-tennis" data-status="${esc(b.status ?? "scheduled")}"><div class="fxui-matchhead"><span>${esc([b.tournament, b.round, b.surface].filter(Boolean).join(" \xB7 "))}</span>${statusBadge(c, b.status)}</div><table class="fxui-tennist"><tbody>${ps.map((p, k) => {
      const won = b.status === "finished" && setsWon[k] > setsWon[1 - k];
      return `<tr${won ? " data-win" : ""}><th scope="row"><span class="fxui-flag">${flag(p.country)}</span>${esc(p.name)}${p.seed ? ` <small>(${esc(p.seed)})</small>` : ""}${p.serving ? `<i class="fxui-serve" title="${esc(c.t("serving"))}"></i>` : ""}${won ? icon("check") : ""}</th>${sets.map((s2, i) => {
        const mine = k ? s2.b : s2.a;
        const theirs = k ? s2.a : s2.b;
        const tb = s2.tiebreak ? String(s2.tiebreak).split(/[-–]/)[k] : "";
        return `<td data-k="s${i}${k}"${mine > theirs ? " data-set" : ""}>${esc(mine)}${tb ? `<sup>${esc(tb)}</sup>` : ""}</td>`;
      }).join("")}${pts.length === 2 ? `<td class="fxui-pts">${esc(pts[k])}</td>` : ""}</tr>`;
    }).join("")}</tbody></table></div>`;
  },
  race: (b, c) => `<div class="fxui-race"><div class="fxui-matchhead"><span>${esc([b.series, b.event, b.session].filter(Boolean).join(" \xB7 "))}</span>${b.status ? statusBadge(c, b.status) : ""}</div><div class="fxui-scroll"><table class="fxui-table fxui-plain"><tbody>${arr4(b.rows).map(
    (r, i) => `<tr data-k="r${i}"${r.pos <= 3 ? ` data-podium="${r.pos}"` : ""}><td class="fxui-pos">${esc(r.pos)}</td><td data-align="left"><span class="fxui-driver" style="--c:${safeColor(r.color, "var(--fxui-line)")}"><i></i><span><strong>${esc(r.name)}</strong>${r.team ? `<small>${esc(r.team)}</small>` : ""}</span></span></td><td data-align="right" class="fxui-mono">${esc(r.status ?? (r.pos === 1 ? r.time ?? "" : r.gap ?? r.time ?? ""))}${r.fastest ? ` <span class="fxui-fast" title="${esc(c.t("fastest"))}">${icon("clock")}</span>` : ""}</td>${arr4(b.rows).some((x) => x.points !== void 0) ? `<td data-align="right" data-strong>${r.points !== void 0 ? `+${fmtNum(c, r.points)}` : ""}</td>` : ""}</tr>`
  ).join("")}</tbody></table></div></div>`,
  fight: (b, c) => {
    const f = arr4(b.fighters);
    const res = b.result;
    const card = (x, k) => {
      const img = safeUrl(x?.image);
      const won = res && res.winner === k;
      return `<div class="fxui-fighter"${won ? " data-win" : ""}><span class="fxui-photo">${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(initials(x?.name))}</span>`}</span><strong>${esc(x?.name ?? "")}</strong>${x?.nickname ? `<small>\u201C${esc(x.nickname)}\u201D</small>` : ""}<span class="fxui-meta">${[flag(x?.country) || esc(x?.country ?? ""), x?.record ? esc(x.record) : ""].filter(Boolean).join(" \xB7 ")}</span>${won ? `<span class="fxui-badge" data-tone="good">${icon("check")}${esc(c.t("winner"))}</span>` : ""}</div>`;
    };
    return `<div class="fxui-fight"><div class="fxui-matchhead"><span>${esc([b.event, b.division, b.rounds ? `${b.rounds} ${c.t("rounds")}` : ""].filter(Boolean).join(" \xB7 "))}</span>${b.status ? statusBadge(c, b.status) : ""}</div><div class="fxui-fighters">${card(f[0], 0)}<span class="fxui-vs">${esc(c.t("vs"))}</span>${card(f[1], 1)}</div>${res ? `<div class="fxui-result">${esc(res.method)}${res.round ? ` \xB7 ${esc(c.t("round"))} ${esc(res.round)}` : ""}${res.time ? ` \xB7 ${esc(res.time)}` : ""}</div>` : ""}</div>`;
  },
  bracket: (b) => `<div class="fxui-scroll"><div class="fxui-bracket">${arr4(b.rounds).map(
    (r, i) => `<div class="fxui-round" data-k="r${i}"><h4>${esc(r.name)}</h4><div class="fxui-rmatches">${arr4(r.matches).map(
      (m, j) => `<div class="fxui-bm" data-k="r${i}m${j}">${["a", "b"].map((s2) => `<div${m.winner === s2 ? " data-win" : ""}><span>${esc(m[s2]?.name ?? "")}</span><b>${esc(m[s2]?.score ?? "")}</b></div>`).join("")}</div>`
    ).join("")}</div></div>`
  ).join("")}</div></div>`
};

// src/ui/blocks/event.ts
var arr5 = (v) => Array.isArray(v) ? v : [];
var STATUS_LABEL = { "on-sale": "onSale", "few-left": "fewLeft", "sold-out": "soldOut", free: "free", cancelled: "cancelled", postponed: "postponed", available: "onSale" };
var statusBadge2 = (c, s2) => s2 ? `<span class="fxui-badge" data-tone="${s2 === "sold-out" || s2 === "cancelled" ? "critical" : s2 === "few-left" || s2 === "postponed" ? "warning" : "good"}">${esc(c.t(STATUS_LABEL[s2] ?? s2))}</span>` : "";
var SHAPES = {
  stadium: {
    north: "M40 8h120a14 14 0 0 1 14 14v6H26v-6A14 14 0 0 1 40 8z",
    south: "M26 112h148v6a14 14 0 0 1-14 14H40a14 14 0 0 1-14-14z",
    west: "M8 36a10 10 0 0 1 10-10h4v88h-4a10 10 0 0 1-10-10z",
    east: "M178 26h4a10 10 0 0 1 10 10v68a10 10 0 0 1-10 10h-4z",
    vip: "M8 58h14v24H8z"
  },
  arena: {
    stage: "M60 6h80v18H60z",
    floor: "M50 32h100v56H50z",
    west: "M10 30h32v80H10z",
    east: "M158 30h32v80h-32z",
    south: "M50 96h100v34H50z",
    vip: "M10 114h32v18H10z"
  },
  theatre: {
    stage: "M50 6h100v20H50z",
    floor: "M36 34h128v48H36z",
    balcony: "M20 92h160l-10 38H30z",
    "stage-left": "M12 34h18v48H12z",
    "stage-right": "M170 34h18v48h-18z"
  },
  club: {
    stage: "M70 6h60v18H70z",
    floor: "M30 32h140v64H30z",
    vip: "M30 104h60v28H30z",
    bar: "M110 104h60v28h-60z"
  }
};
var HOUR = 36e5;
function phase(c, start, end, defaultHours = 4) {
  const s2 = typeof start === "string" ? Date.parse(start) : NaN;
  if (!Number.isFinite(s2)) return "unknown";
  const e = typeof end === "string" && Number.isFinite(Date.parse(end)) ? Date.parse(end) : s2 + defaultHours * HOUR;
  c.expire(s2);
  c.expire(e);
  return c.now < s2 ? "before" : c.now < e ? "during" : "after";
}
function dayLabel(c, iso) {
  const key = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: c.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
  try {
    const k = key(Date.parse(iso));
    if (k === key(c.now)) return c.t("today");
    if (k === key(c.now + 24 * HOUR)) return c.t("tomorrow");
  } catch {
  }
  return fmtDate(c, iso, "day");
}
var dayKey = (c, iso) => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: c.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.parse(iso)));
  } catch {
    return String(iso).slice(0, 10);
  }
};
var events = {
  event: (b, c) => {
    const img = safeUrl(b.image);
    const u = safeUrl(b.url);
    const v = b.venue ?? {};
    const when = b.start ? `${fmtDate(c, b.start)}${b.end ? ` \u2013 ${fmtDate(c, b.end, String(b.end).slice(0, 10) === String(b.start).slice(0, 10) ? "time" : "datetime")}` : ""}` : "";
    const start = b.start ? new Date(b.start) : null;
    const day = start && !Number.isNaN(start.getTime()) ? `<span class="fxui-datebox"><b>${fmtDate(c, b.start, "dom")}</b><small>${fmtDate(c, b.start, "month")}</small></span>` : "";
    const ph = phase(c, b.start, b.end);
    const salesEnd = Date.parse(b.salesEnd);
    const salesOver = Number.isFinite(salesEnd) && salesEnd <= c.now;
    if (Number.isFinite(salesEnd) && !salesOver) c.expire(salesEnd);
    const recap = safeUrl(b.recap);
    const badge = ph === "after" && b.status !== "cancelled" && b.status !== "postponed" ? `<span class="fxui-badge" data-tone="neutral">${esc(c.t("ended"))}</span>` : ph === "during" && b.status !== "cancelled" ? `<span class="fxui-badge" data-tone="live"><i class="fxui-pulse"></i>${esc(c.t("happening"))}</span>` : statusBadge2(c, b.status);
    const action = ph === "after" ? recap ? `<a class="fxui-btn" data-variant="secondary" ${linkAttrs(recap)}>${esc(b.recapLabel || c.t("recap"))}${icon("arrow")}</a>` : "" : u && !salesOver && b.status !== "sold-out" && b.status !== "cancelled" ? `<a class="fxui-btn" data-variant="primary" ${linkAttrs(u)}>${icon("ticket")}${esc(b.cta ?? c.t("buy"))}</a>` : "";
    const price = ph !== "after" && !salesOver && typeof b.priceFrom === "number" ? `<span class="fxui-price"><small>${esc(c.t("from"))}</small> <strong>${money(c, b.priceFrom, b.currency)}</strong></span>` : "";
    const seller = ph !== "after" && !salesOver && b.seller ? `<small class="fxui-seller">${esc(c.t("ticketsAt"))} ${esc(b.seller)}</small>` : "";
    return `<article class="fxui-eventcard${img ? "" : " fxui-noimg"}" data-phase="${ph}">${img ? `<div class="fxui-media"><img src="${esc(img)}" alt="" loading="lazy">${day}</div>` : ""}<div class="fxui-body"><div class="fxui-row">${b.category ? `<span class="fxui-chip">${esc(b.category)}</span>` : "<span></span>"}${badge}</div><strong class="fxui-name">${esc(b.name)}</strong>${arr5(b.artists).length ? `<span class="fxui-meta">${arr5(b.artists).map(esc).join(" \xB7 ")}</span>` : ""}<ul class="fxui-facts">${when ? `<li>${icon("calendar")}<span>${when}</span></li>` : ""}${v.name ? `<li>${icon("pin")}<span>${esc([v.name, v.city].filter(Boolean).join(", "))}</span></li>` : ""}</ul><div class="fxui-row">${price || seller ? `<span class="fxui-pricebox">${price}${seller}</span>` : "<span></span>"}${action}</div></div></article>`;
  },
  tickets: (b, c) => {
    const closesAt = Date.parse(b.closes);
    const closed = Number.isFinite(closesAt) && closesAt <= c.now;
    if (Number.isFinite(closesAt)) c.expire(closesAt);
    const u = closed ? "" : safeUrl(b.url);
    const id = c.uid("tier");
    return `<div class="fxui-tickets" data-url="${esc(u)}"${closed ? " data-closed" : ""}><fieldset${closed ? " disabled" : ""}><div class="fxui-tiers">${arr5(b.tiers).map((t2, i) => {
      const sold = closed || t2.status === "sold-out" || t2.remaining === 0;
      return `<label data-k="t${i}"${sold ? " data-sold" : ""}><input type="radio" name="${id}" value="${esc(t2.name)}"${sold ? " disabled" : ""}><span class="fxui-tier"><span class="fxui-row"><strong>${esc(t2.name)}</strong><b>${money(c, t2.price, b.currency)}</b></span>${arr5(t2.perks).length ? `<ul>${arr5(t2.perks).map((p) => `<li>${icon("check")}${esc(p)}</li>`).join("")}</ul>` : ""}${closed ? "" : sold ? statusBadge2(c, "sold-out") : t2.status === "few-left" || typeof t2.remaining === "number" && t2.remaining < 50 ? `<span class="fxui-badge" data-tone="warning">${typeof t2.remaining === "number" ? `${fmtNum(c, t2.remaining)} ${esc(c.t("left"))}` : esc(c.t("fewLeft"))}</span>` : ""}</span></label>`;
    }).join("")}</div></fieldset>${closed ? `<p class="fxui-closed">${icon("clock")}${esc(c.t("salesClosed"))}</p>` : u ? `<a class="fxui-btn fxui-checkout" data-variant="primary" ${linkAttrs(u)} aria-disabled="true">${icon("ticket")}<span>${esc(c.t("buy"))}</span></a>` : ""}</div>`;
  },
  listing: (b, c) => {
    const items = arr5(b.items).filter((x) => typeof x.start === "string" && Number.isFinite(Date.parse(x.start))).sort((x, y) => Date.parse(x.start) - Date.parse(y.start));
    if (!items.length) return `<p class="fxui-empty">${esc(c.t("nothing"))}</p>`;
    const cats = Array.from(new Set(items.map((x) => x.category).filter(Boolean)));
    const filters = b.filters && cats.length > 1 ? `<div class="fxui-filters" role="group">${["", ...cats].map((x, i) => `<button type="button" data-cat="${esc(x)}" aria-pressed="${i === 0}">${esc(x || c.t("all"))}</button>`).join("")}</div>` : "";
    const groups = /* @__PURE__ */ new Map();
    for (const x of items) {
      const k = dayKey(c, x.start);
      groups.set(k, [...groups.get(k) ?? [], x]);
    }
    let n = 0;
    return `<div class="fxui-listing">${filters}${Array.from(groups.values()).map(
      (list) => `<section class="fxui-day" data-k="d${esc(dayKey(c, list[0].start))}"><h4>${esc(dayLabel(c, list[0].start))}</h4><ul role="list">${list.map((x) => {
        const ph = phase(c, x.start, x.end, 3);
        const img = safeUrl(x.image);
        const u = safeUrl(x.url);
        const price = x.status === "free" ? esc(c.t("free")) : typeof x.price === "number" ? `${esc(c.t("from"))} ${money(c, x.price, x.currency)}` : "";
        const badge = ph === "after" ? `<span class="fxui-badge" data-tone="neutral">${esc(c.t("ended"))}</span>` : ph === "during" ? `<span class="fxui-badge" data-tone="live"><i class="fxui-pulse"></i>${esc(c.t("happening"))}</span>` : x.status && x.status !== "on-sale" && x.status !== "free" ? statusBadge2(c, x.status) : "";
        const title = u ? `<a ${linkAttrs(u)}>${esc(x.title)}</a>` : esc(x.title);
        return `<li data-k="e${n++}" data-cat="${esc(x.category ?? "")}" data-phase="${ph}"><time datetime="${esc(x.start)}">${fmtDate(c, x.start, "time")}</time>${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="fxui-lthumb">${icon("ticket")}</span>`}<div class="fxui-lbody"><strong>${title}</strong><span class="fxui-meta">${[x.venue ? esc(x.venue) : "", x.category ? esc(x.category) : ""].filter(Boolean).join(" \xB7 ")}</span></div><div class="fxui-lside">${badge}${price ? `<span class="fxui-lprice">${price}</span>` : ""}${x.seller && ph !== "after" ? `<small>${esc(c.t("ticketsAt"))} ${esc(x.seller)}</small>` : ""}</div></li>`;
      }).join("")}</ul></section>`
    ).join("")}</div>`;
  },
  venue: (b, c) => {
    const img = safeUrl(b.image);
    const u = safeUrl(b.url);
    const q = typeof b.lat === "number" && typeof b.lng === "number" ? `${b.lat},${b.lng}` : [b.name, b.address, b.city].filter(Boolean).join(", ");
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    return `<article class="fxui-venue${img ? "" : " fxui-noimg"}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ""}<div class="fxui-body"><strong class="fxui-name">${u ? `<a ${linkAttrs(u)}>${esc(b.name)}</a>` : esc(b.name)}</strong><ul class="fxui-facts">${b.address || b.city ? `<li>${icon("pin")}<span>${esc([b.address, b.city].filter(Boolean).join(", "))}</span></li>` : ""}${typeof b.capacity === "number" ? `<li>${icon("users")}<span>${esc(c.t("capacity"))} ${fmtNum(c, b.capacity)}</span></li>` : ""}${arr5(b.transport).map((tr) => `<li>${icon("train")}<span>${esc(tr)}</span></li>`).join("")}</ul><a class="fxui-btn" data-variant="secondary" ${linkAttrs(maps)}>${icon("pin")}${esc(c.t("directions"))}</a></div></article>`;
  },
  schedule: (b) => `<ol class="fxui-schedule">${arr5(b.items).map((s2, i) => {
    const img = safeUrl(s2.image);
    return `<li data-k="s${i}"><time>${esc(s2.time)}</time>${img ? `<img src="${esc(img)}" alt="">` : '<span class="fxui-dot" aria-hidden="true"></span>'}<div><strong>${esc(s2.name)}</strong>${s2.stage || s2.note ? `<small>${esc([s2.stage, s2.note].filter(Boolean).join(" \xB7 "))}</small>` : ""}</div></li>`;
  }).join("")}</ol>`,
  zones: (b, c) => {
    const layout = SHAPES[b.layout ?? "stadium"] ? b.layout ?? "stadium" : "stadium";
    const shapes = SHAPES[layout];
    const zones = arr5(b.zones);
    const known = zones.filter((z) => shapes[z.id]);
    const u = safeUrl(b.url);
    const field = layout === "stadium" ? '<rect class="fxui-field" x="30" y="32" width="140" height="76" rx="4"/><path class="fxui-fieldline" d="M100 32v76M30 54h16v32H30M170 54h-16v32h16"/><circle class="fxui-fieldline" cx="100" cy="70" r="11"/>' : "";
    return `<div class="fxui-zones" data-url="${esc(u)}"><svg viewBox="0 0 200 140" class="fxui-venuemap" role="group" aria-label="${esc(b.title ?? "Venue map")}">${field}${Object.entries(shapes).map(([id, d]) => {
      const z = known.find((x) => x.id === id);
      if (!z) return `<path class="fxui-zone" d="${d}" data-off/>`;
      const sold = z.status === "sold-out";
      return `<path class="fxui-zone" d="${d}" data-zone="${esc(id)}" data-status="${esc(z.status ?? "available")}" role="button" tabindex="${sold ? -1 : 0}" aria-label="${esc(z.name)}${typeof z.price === "number" ? `, ${money(c, z.price, b.currency)}` : ""}${sold ? `, ${esc(c.t("soldOut"))}` : ""}"${sold ? ' aria-disabled="true"' : ""}><title>${esc(z.name)}</title></path>`;
    }).join("")}</svg><ul class="fxui-zonelist">${zones.map(
      (z, i) => `<li data-k="z${i}"><button type="button" data-zone="${esc(z.id)}" data-status="${esc(z.status ?? "available")}"${z.status === "sold-out" ? " disabled" : ""}><i></i><span>${esc(z.name)}</span><b>${typeof z.price === "number" ? money(c, z.price, b.currency) : ""}</b>${z.status && z.status !== "available" ? statusBadge2(c, z.status) : ""}</button></li>`
    ).join("")}</ul>${u ? `<div class="fxui-zonecta"><span class="fxui-zonesel" aria-live="polite">${esc(c.t("choose"))}</span><a class="fxui-btn" data-variant="primary" ${linkAttrs(u)} aria-disabled="true">${icon("ticket")}<span>${esc(c.t("continue"))}</span></a></div>` : ""}</div>`;
  }
};

// src/ui/render.ts
var RENDERERS = { ...content, ...media, ...data, ...sport, ...events };
var docs = 0;
function makeCtx(o) {
  let n = 0;
  const seed = (++docs).toString(36) + Math.random().toString(36).slice(2, 5);
  const ctx = {
    lang: o.lang,
    locale: o.locale ?? (o.lang === "sq" ? "sq-AL" : "en-GB"),
    timeZone: o.timeZone,
    now: o.now ?? Date.now(),
    t: labels(o.lang),
    uid: (p = "u") => `fxui-${p}-${seed}${(n++).toString(36)}`,
    blocks: (list) => Array.isArray(list) ? list.map((b) => renderBlock(b, ctx)).join("") : "",
    expire: (at) => {
      if (Number.isFinite(at) && at > ctx.now && (ctx.exp === void 0 || at < ctx.exp)) ctx.exp = at;
    }
  };
  return ctx;
}
var EVIDENCE_ICON = { verified: "shield", reported: "info", unconfirmed: "warn", analysis: "bulb" };
function evidence(e, c) {
  if (!e || typeof e !== "object") return "";
  const v = e;
  if (!v.status) return "";
  const u = safeUrl(v.url);
  const src = v.source ? u ? `<a ${linkAttrs(u)}>${esc(v.source)}</a>` : esc(v.source) : "";
  const parts = [`<strong>${esc(c.t(v.status))}</strong>`, v.asOf ? fmtDate(c, v.asOf) : "", src].filter(Boolean);
  return `<p class="fxui-evidence" data-status="${esc(v.status)}">${icon(EVIDENCE_ICON[v.status] ?? "info")}<span>${parts.join(" \xB7 ")}</span></p>`;
}
function renderBlock(b, c) {
  const r = RENDERERS[b.type];
  if (!r) return "";
  let body = "";
  const outer = c.exp;
  c.exp = void 0;
  try {
    body = r(b, c);
  } catch (err) {
    body = "";
    if (typeof console !== "undefined") console.debug?.("[lumafx/ui]", b.type, err);
  }
  const exp = c.exp;
  c.exp = outer === void 0 ? exp : exp === void 0 ? outer : Math.min(outer, exp);
  const title = typeof b.title === "string" && b.title ? `<h3 class="fxui-title">${esc(b.title)}</h3>` : "";
  const note = typeof b.note === "string" && b.note ? `<div class="fxui-note">${md(b.note)}</div>` : "";
  const id = typeof b.id === "string" && b.id ? ` data-id="${esc(b.id)}"` : "";
  const expires = exp !== void 0 ? ` data-expires="${exp}"` : "";
  return `<section class="fxui-b fxui-b-${esc(b.type)}" data-type="${esc(b.type)}"${id}${expires}>${title}${body}${evidence(b.evidence, c)}${note}</section>`;
}
function flatten(blocks) {
  const out = [];
  const walk = (list) => {
    if (!Array.isArray(list)) return;
    for (const b of list) {
      if (!b || !RENDERERS[b.type]) continue;
      out.push(b);
      if (b.type === "group") walk(b.blocks);
      if (b.type === "tabs" && Array.isArray(b.tabs)) for (const tab of b.tabs) walk(tab?.blocks);
    }
  };
  walk(blocks);
  return out;
}
function renderToString(input, o = {}) {
  const { doc } = validate(input, { partial: o.partial ?? true });
  const lang = o.lang ?? doc.lang ?? "en";
  const c = makeCtx({ ...o, lang });
  const embed = o.embed !== false ? `<script type="application/json" class="fxui-data">${JSON.stringify(doc).replace(/</g, "\\u003c")}<\/script>` : "";
  const theme = o.theme === "light" || o.theme === "dark" ? ` data-theme="${o.theme}"` : "";
  return `<div class="fxui" lang="${esc(lang)}"${theme}>${doc.blocks.map((b) => renderBlock(b, c)).join("")}${embed}</div>`;
}

// src/ui/partial.ts
var WHOLE = /* @__PURE__ */ new Set(["type", "start", "end", "kickoff", "date", "closes", "asOf", "time", "currency", "lang", "theme", "tone", "variant", "status", "spotify", "youtube", "instagram", "tickets", "recap", "email", "phone"]);
var LINK = /(?:url|href|src|image|images|img|poster|logo|avatar|photo|thumb|thumbnail|website|link)$/i;
var whole = (key) => key !== void 0 && (WHOLE.has(key) || LINK.test(key));
function parsePartial(text) {
  const start = text.search(/[[{]/);
  if (start < 0) return void 0;
  const s2 = text;
  let i = start;
  const ws = () => {
    while (i < s2.length && /\s/.test(s2[i])) i++;
  };
  const INCOMPLETE = /* @__PURE__ */ Symbol("incomplete");
  function str() {
    i++;
    let out = "";
    while (i < s2.length) {
      const c = s2[i];
      if (c === '"') {
        i++;
        return { v: out, done: true };
      }
      if (c === "\\") {
        if (i + 1 >= s2.length) break;
        const n = s2[i + 1];
        if (n === "u") {
          const hex = s2.slice(i + 2, i + 6);
          if (hex.length < 4 || !/^[0-9a-f]{4}$/i.test(hex)) break;
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        out += { n: "\n", t: "	", r: "\r", b: "\b", f: "\f" }[n] ?? n;
        i += 2;
        continue;
      }
      out += c;
      i++;
    }
    i = s2.length;
    return { v: out, done: false };
  }
  function value(key) {
    ws();
    if (i >= s2.length) return INCOMPLETE;
    const c = s2[i];
    if (c === "{") return obj();
    if (c === "[") return arr8(key);
    if (c === '"') {
      const r = str();
      return r.done || !whole(key) ? r.v : INCOMPLETE;
    }
    const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(s2.slice(i, i + 40));
    if (m) {
      const end = i + m[0].length;
      i = end;
      return JSON.parse(m[0]);
    }
    i = s2.length;
    return INCOMPLETE;
  }
  function obj() {
    i++;
    const out = {};
    while (true) {
      ws();
      if (i >= s2.length) return out;
      if (s2[i] === "}") {
        i++;
        return out;
      }
      if (s2[i] === ",") {
        i++;
        continue;
      }
      if (s2[i] !== '"') {
        i = s2.length;
        return out;
      }
      const k = str();
      if (!k.done) return out;
      ws();
      if (s2[i] !== ":") return out;
      i++;
      const v2 = value(k.v);
      if (v2 === INCOMPLETE) return out;
      out[k.v] = v2;
    }
  }
  function arr8(key) {
    i++;
    const out = [];
    while (true) {
      ws();
      if (i >= s2.length) return out;
      if (s2[i] === "]") {
        i++;
        return out;
      }
      if (s2[i] === ",") {
        i++;
        continue;
      }
      const v2 = value(key);
      if (v2 === INCOMPLETE) return out;
      out.push(v2);
    }
  }
  const v = value();
  return v === INCOMPLETE ? void 0 : v;
}

// src/ui/text.ts
var arr6 = (v) => Array.isArray(v) ? v : [];
var s = (v) => v === void 0 || v === null ? "" : String(v);
var join = (parts, sep = " \xB7 ") => parts.map(s).filter(Boolean).join(sep);
var TEXT = {
  text: (b) => s(b.md),
  callout: (b) => s(b.text),
  details: (b) => arr6(b.items).map((i) => `${i.label}: ${i.value}`).join("\n"),
  faq: (b) => arr6(b.items).map((i) => `Q: ${i.q}
A: ${i.a}`).join("\n"),
  table: (b) => [arr6(b.columns).map((c) => c.label).join(" | "), ...arr6(b.rows).map((r) => arr6(r).join(" | "))].join("\n"),
  stats: (b) => arr6(b.items).map((i) => `${i.label}: ${i.value}${i.unit ? " " + i.unit : ""}${typeof i.delta === "number" ? ` (${i.delta > 0 ? "+" : ""}${i.delta}%)` : ""}`).join("\n"),
  chart: (b) => arr6(b.series).map((x) => `${x.name}: ${arr6(b.labels).map((l, i) => `${l} ${arr6(x.values)[i] ?? "\u2014"}`).join(", ")}`).join("\n"),
  steps: (b) => arr6(b.items).map((i, k) => `${k + 1}. ${i.title}${i.text ? " \u2013 " + i.text : ""}`).join("\n"),
  timeline: (b) => arr6(b.items).map((i) => `${i.time} ${i.title}`).join("\n"),
  compare: (b) => arr6(b.items).map((i) => `${i.name}${i.price ? ` (${i.price})` : ""}: ${Object.entries(i.values ?? {}).map(([k, v]) => `${k} ${v}`).join(", ")}`).join("\n"),
  product: (b) => join([b.name, b.price !== void 0 ? `${b.price} ${b.currency ?? ""}`.trim() : "", b.url]),
  quote: (b) => `\u201C${s(b.text)}\u201D${b.author ? ` \u2013 ${b.author}` : ""}`,
  progress: (b) => arr6(b.items).map((i) => `${i.label}: ${i.value}${i.max ? "/" + i.max : "%"}`).join("\n"),
  weather: (b) => join([b.location, b.now ? `${b.now.temp}\xB0, ${b.now.condition}` : "", ...arr6(b.days).map((d) => `${d.day} ${d.lo}\u2013${d.hi}\xB0`)], "; "),
  places: (b) => arr6(b.items).map((p) => join([p.name, p.category, p.address, p.rating ? `\u2605${p.rating}` : ""])).join("\n"),
  itinerary: (b) => arr6(b.days).map((d) => `${d.label}: ${arr6(d.stops).map((x) => join([x.time, x.name], " ")).join(", ")}`).join("\n"),
  quiz: (b) => arr6(b.questions).map((q) => `${q.q} (${arr6(q.options).join(" / ")})`).join("\n"),
  actions: (b) => arr6(b.buttons).map((x) => `${x.label}: ${x.url}`).join("\n"),
  video: (b) => (arr6(b.items).length ? arr6(b.items) : [b]).map((v) => join([v.title, v.channel, v.url], " \u2013 ")).join("\n"),
  artists: (b) => arr6(b.items).map((a) => join([a.name, a.role, arr6(a.genres).join(", "), a.url ?? a.spotify])).join("\n"),
  poll: (b) => `${s(b.question)} ${arr6(b.options).map((o) => `${o.label}${typeof o.votes === "number" ? ` (${o.votes})` : ""}`).join(" / ")}`,
  listing: (b) => arr6(b.items).map((x) => join([x.start, x.title, x.venue, typeof x.price === "number" ? `${x.price} ${x.currency ?? ""}`.trim() : "", x.seller ? `tickets: ${x.seller}` : "", x.url])).join("\n"),
  fixtures: (b) => [join([b.competition, b.round]), ...arr6(b.items).map((x) => `${x.home} ${Array.isArray(x.score) && x.score.length === 2 ? `${x.score[0]}\u2013${x.score[1]}` : "vs"} ${x.away}${x.kickoff ? ` (${x.kickoff})` : ""}`)].filter(Boolean).join("\n"),
  suggestions: (b) => arr6(b.items).map((x) => `\u2192 ${x.text}`).join("\n"),
  sources: (b) => arr6(b.items).map((x, i) => `[${i + 1}] ${x.title} \u2013 ${x.url}`).join("\n"),
  countdown: (b) => join([b.label, b.to]),
  match: (b) => join([
    `${b.home?.name ?? ""} ${Array.isArray(b.score) && b.score.length === 2 ? `${b.score[0]}\u2013${b.score[1]}` : "vs"} ${b.away?.name ?? ""}`,
    b.status === "live" ? `live ${s(b.minute)}` : b.status,
    b.kickoff,
    b.competition,
    b.venue
  ]),
  lineup: (b) => {
    const p = arr6(b.players).map((x) => `${x.name}${x.number !== void 0 ? ` (${x.number})` : ""}`);
    return `${b.team?.name ?? ""}${b.formation ? ` ${b.formation}` : ""}: ${p.join(", ")}${b.coach ? `. Coach: ${b.coach}` : ""}`;
  },
  events: (b) => arr6(b.items).map((e) => join([e.minute, e.type, e.player ?? e.in, e.score], " ")).join("\n"),
  "match-stats": (b) => arr6(b.items).map((i) => `${i.label}: ${i.home}${i.unit ?? ""} \u2013 ${i.away}${i.unit ?? ""}`).join("\n"),
  standings: (b) => arr6(b.rows).map((r) => join([`${r.pos}. ${r.team}`, r.played !== void 0 ? `P${r.played}` : "", r.points !== void 0 ? `${r.points} pts` : ""], " ")).join("\n"),
  h2h: (b) => arr6(b.matches).map((m) => `${m.date} ${m.home} ${m.score} ${m.away}`).join("\n"),
  player: (b) => join([b.name, b.position, b.team, ...arr6(b.stats).map((x) => `${x.label} ${x.value}`)]),
  scoreboard: (b) => join([`${b.home?.name ?? ""} ${arr6(b.total).join("\u2013")} ${b.away?.name ?? ""}`, b.clock, b.status]),
  tennis: (b) => `${arr6(b.players).map((p) => p.name).join(" vs ")}: ${arr6(b.sets).map((x) => `${x.a}-${x.b}`).join(", ")}`,
  race: (b) => arr6(b.rows).map((r) => join([`${r.pos}. ${r.name}`, r.team, r.time ?? r.gap], " ")).join("\n"),
  fight: (b) => `${arr6(b.fighters).map((f) => f.name).join(" vs ")}${b.result ? ` \u2013 ${arr6(b.fighters)[b.result.winner]?.name ?? ""} by ${b.result.method}` : ""}`,
  bracket: (b) => arr6(b.rounds).map((r) => `${r.name}: ${arr6(r.matches).map((m) => `${m.a?.name} ${s(m.a?.score)}\u2013${s(m.b?.score)} ${m.b?.name}`).join("; ")}`).join("\n"),
  event: (b) => join([b.name, b.start, b.venue?.name, b.priceFrom !== void 0 ? `from ${b.priceFrom} ${b.currency ?? ""}`.trim() : "", b.seller ? `tickets: ${b.seller}` : "", b.url]),
  tickets: (b) => arr6(b.tiers).map((t2) => `${t2.name}: ${t2.price} ${b.currency ?? ""}${t2.status === "sold-out" ? " (sold out)" : ""}`.trim()).join("\n"),
  venue: (b) => join([b.name, b.address, b.city, b.capacity ? `capacity ${b.capacity}` : ""]),
  schedule: (b) => arr6(b.items).map((x) => join([x.time, x.name, x.stage], " ")).join("\n"),
  zones: (b) => arr6(b.zones).map((z) => `${z.name}${z.price !== void 0 ? `: ${z.price} ${b.currency ?? ""}` : ""}${z.status === "sold-out" ? " (sold out)" : ""}`.trim()).join("\n")
};
function blockToText(b) {
  const nested = b.type === "group" ? arr6(b.blocks) : b.type === "tabs" ? arr6(b.tabs).flatMap((t2) => [{ type: "text", md: `## ${t2.label}` }, ...arr6(t2.blocks)]) : null;
  const body = nested ? nested.map((x) => blockToText(x)).filter(Boolean).join("\n\n") : TEXT[b.type]?.(b) ?? "";
  const ev = b.evidence;
  const proof = ev?.status ? `(${join([ev.status, ev.source, ev.asOf], ", ")})` : "";
  return [b.title ? `## ${b.title}` : "", body, proof, b.note ? s(b.note) : ""].filter(Boolean).join("\n");
}
function toText(doc) {
  return doc.blocks.map(blockToText).filter(Boolean).join("\n\n");
}

// src/ui/seo.ts
var S2 = "https://schema.org/";
var arr7 = (v) => Array.isArray(v) ? v : [];
var clean = (o) => {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v === void 0 || v === null || v === "" || Array.isArray(v) && !v.length) delete o[k];
  }
  return o;
};
var plain = (s2) => String(s2 ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>]+/g, "").replace(/\s+/g, " ").trim();
var money2 = (n) => typeof n === "number" && Number.isFinite(n) ? Number(n.toFixed(2)) : void 0;
var iso4217 = (c) => typeof c === "string" && /^[A-Z]{3}$/.test(c.trim().toUpperCase()) ? c.trim().toUpperCase() : void 0;
var STATUS = { cancelled: "EventCancelled", postponed: "EventPostponed" };
var eventStatus = (s2) => S2 + (STATUS[s2 ?? ""] ?? "EventScheduled");
var availability = (s2, remaining) => S2 + (s2 === "sold-out" || remaining === 0 ? "SoldOut" : s2 === "few-left" || typeof remaining === "number" && remaining < 50 ? "LimitedAvailability" : "InStock");
var MUSIC = /music|muzik|concert|koncert|festival|dj|club|klub|live|rock|jazz|pop|techno|house/i;
function place(v, venue) {
  const name = typeof v === "string" ? v : v?.name ?? venue?.name;
  if (!name) return void 0;
  const city = typeof v === "object" && v?.city || venue?.city;
  const street = typeof v === "object" && v?.address || venue?.address;
  return clean({
    "@type": "Place",
    name,
    address: city || street ? clean({ "@type": "PostalAddress", streetAddress: street, addressLocality: city }) : void 0,
    geo: typeof venue?.lat === "number" && typeof venue?.lng === "number" ? { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng } : void 0
  });
}
function performers(blocks) {
  return blocks.filter((b) => b.type === "artists").flatMap((b) => arr7(b.items)).map(
    (a) => clean({
      "@type": "PerformingGroup",
      name: a.name,
      image: safeUrl(a.image) || void 0,
      url: safeUrl(a.url) || void 0,
      sameAs: [a.spotify, a.youtube, a.instagram].map(safeUrl).filter(Boolean)
    })
  );
}
function offers(tickets, fallback) {
  if (tickets) {
    const cur = iso4217(tickets.currency);
    const list = arr7(tickets.tiers).map(
      (t2) => clean({
        "@type": "Offer",
        name: t2.name,
        price: money2(t2.price),
        priceCurrency: cur,
        availability: availability(t2.status, t2.remaining),
        url: safeUrl(tickets.url) || fallback.url || void 0,
        validThrough: tickets.closes ?? fallback.until
      })
    );
    if (list.length) return list;
  }
  if (typeof fallback.price === "number")
    return clean({ "@type": "Offer", price: money2(fallback.price), priceCurrency: iso4217(fallback.currency), url: fallback.url, availability: availability(fallback.status), validThrough: fallback.until });
  return void 0;
}
function jsonLd(input, meta = {}) {
  const { doc } = validate(input);
  const blocks = flatten(doc.blocks);
  const graph = [];
  const base = safeUrl(meta.url) || "";
  const id = (k) => base ? `${base}#${k}` : void 0;
  const about = [];
  const tickets = blocks.find((b) => b.type === "tickets");
  const venue = blocks.find((b) => b.type === "venue");
  const perf = performers(blocks);
  let n = 0;
  for (const b of blocks) {
    switch (b.type) {
      case "event": {
        const music = MUSIC.test(`${b.category ?? ""} ${b.name ?? ""}`) || perf.length > 0;
        const node = clean({
          "@type": music ? "MusicEvent" : "Event",
          "@id": id(`event-${++n}`),
          name: b.name,
          startDate: b.start,
          endDate: b.end,
          eventStatus: eventStatus(b.status),
          eventAttendanceMode: S2 + "OfflineEventAttendanceMode",
          location: place(b.venue, venue),
          image: safeUrl(b.image) || void 0,
          url: safeUrl(b.url) || void 0,
          offers: offers(tickets, { price: b.priceFrom, currency: b.currency, url: safeUrl(b.url) || void 0, status: b.status, until: b.salesEnd }),
          performer: perf.length ? perf : arr7(b.artists).map((name) => ({ "@type": "PerformingGroup", name }))
        });
        graph.push(node);
        if (node["@id"]) about.push({ "@id": node["@id"] });
        break;
      }
      case "match": {
        const home = b.home?.name;
        const away = b.away?.name;
        if (!home || !away) break;
        const team = (t2) => clean({ "@type": "SportsTeam", name: t2.name, logo: safeUrl(t2.logo) || void 0 });
        const node = clean({
          "@type": "SportsEvent",
          "@id": id(`match-${++n}`),
          name: `${home} \u2013 ${away}`,
          description: [b.competition, b.round].filter(Boolean).join(" \xB7 ") || void 0,
          startDate: b.kickoff,
          eventStatus: eventStatus(b.status),
          eventAttendanceMode: S2 + "OfflineEventAttendanceMode",
          sport: !b.sport || /football|soccer|futboll/i.test(b.sport) ? "Football" : b.sport,
          location: place(b.venue, venue),
          homeTeam: team(b.home),
          awayTeam: team(b.away),
          competitor: [team(b.home), team(b.away)],
          url: safeUrl(b.url) || void 0,
          offers: safeUrl(b.tickets) ? clean({ "@type": "Offer", url: safeUrl(b.tickets), availability: S2 + "InStock" }) : void 0
        });
        graph.push(node);
        if (node["@id"]) about.push({ "@id": node["@id"] });
        break;
      }
      case "faq": {
        const q = arr7(b.items).filter((i) => i.q && i.a);
        if (q.length)
          graph.push({
            "@type": "FAQPage",
            "@id": id("faq"),
            mainEntity: q.map((i) => ({ "@type": "Question", name: plain(i.q), acceptedAnswer: { "@type": "Answer", text: plain(i.a) } }))
          });
        break;
      }
      case "fixtures": {
        const items = arr7(b.items).filter((x) => x.home && x.away);
        if (items.length)
          graph.push(
            clean({
              "@type": "ItemList",
              name: [b.competition, b.round].filter(Boolean).join(" \xB7 ") || void 0,
              itemListElement: items.map((x, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: clean({
                  "@type": "SportsEvent",
                  name: `${x.home} \u2013 ${x.away}`,
                  startDate: x.kickoff,
                  eventStatus: eventStatus(x.status),
                  homeTeam: { "@type": "SportsTeam", name: x.home },
                  awayTeam: { "@type": "SportsTeam", name: x.away },
                  location: x.venue ? { "@type": "Place", name: x.venue } : void 0,
                  url: safeUrl(x.url) || void 0
                })
              }))
            })
          );
        break;
      }
      case "listing": {
        const items = arr7(b.items).filter((x) => x.title && x.start);
        if (items.length)
          graph.push({
            "@type": "ItemList",
            itemListElement: items.map((x, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: clean({
                "@type": MUSIC.test(`${x.category ?? ""}`) ? "MusicEvent" : "Event",
                name: x.title,
                startDate: x.start,
                endDate: x.end,
                eventStatus: eventStatus(x.status),
                eventAttendanceMode: S2 + "OfflineEventAttendanceMode",
                location: x.venue ? { "@type": "Place", name: x.venue } : void 0,
                image: safeUrl(x.image) || void 0,
                url: safeUrl(x.url) || void 0,
                offers: typeof x.price === "number" ? clean({ "@type": "Offer", price: money2(x.price), priceCurrency: iso4217(x.currency), availability: availability(x.status) }) : void 0
              })
            }))
          });
        break;
      }
      case "video": {
        const items = arr7(b.items).length ? arr7(b.items) : b.url ? [b] : [];
        for (const v of items) {
          const ref = parseVideo(v.url, v.start);
          if (!ref) continue;
          graph.push(
            clean({
              "@type": "VideoObject",
              name: v.title ?? b.title,
              description: v.title ?? b.title,
              thumbnailUrl: safeUrl(v.poster) || ref.poster || void 0,
              embedUrl: ref.embed.split("?")[0],
              contentUrl: ref.watch,
              uploadDate: v.date ?? b.date
            })
          );
        }
        break;
      }
    }
  }
  for (const ev of graph.filter((x) => x["@type"] === "Event" || x["@type"] === "MusicEvent")) {
    const t2 = Date.parse(String(ev.startDate));
    const m = graph.find((x) => x["@type"] === "SportsEvent" && Number.isFinite(t2) && Date.parse(String(x.startDate)) === t2);
    if (!m) continue;
    for (const k of ["offers", "image", "url", "location"]) if (ev[k] && !m[k]) m[k] = ev[k];
    graph.splice(graph.indexOf(ev), 1);
    const i = about.findIndex((a) => a["@id"] === ev["@id"]);
    if (i >= 0) about.splice(i, 1);
  }
  if (meta.headline) {
    const author = typeof meta.author === "string" ? { name: meta.author } : meta.author;
    const sources = blocks.filter((b) => b.type === "sources").flatMap((b) => arr7(b.items).map((s2) => safeUrl(s2.url))).filter(Boolean);
    graph.unshift(
      clean({
        "@type": meta.type ?? "NewsArticle",
        "@id": id("article"),
        headline: meta.headline,
        description: meta.description,
        image: safeUrl(meta.image) || void 0,
        datePublished: meta.datePublished,
        dateModified: meta.dateModified ?? meta.datePublished,
        inLanguage: meta.inLanguage ?? doc.lang,
        mainEntityOfPage: base || void 0,
        author: author ? clean({ "@type": author.type ?? "Organization", name: author.name, url: author.url }) : void 0,
        publisher: meta.publisher ? clean({ "@type": "Organization", name: meta.publisher.name, url: meta.publisher.url, logo: meta.publisher.logo ? { "@type": "ImageObject", url: meta.publisher.logo } : void 0 }) : void 0,
        about: about.length ? about : void 0,
        citation: sources.length ? sources : void 0
      })
    );
  }
  if (meta.breadcrumbs?.length)
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: meta.breadcrumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: safeUrl(c.url) || void 0 }))
    });
  return { "@context": "https://schema.org", "@graph": graph };
}
function jsonLdScript(input, meta = {}) {
  return `<script type="application/ld+json">${JSON.stringify(jsonLd(input, meta)).replace(/</g, "\\u003c")}<\/script>`;
}

export {
  S,
  opt,
  COMMON,
  BLOCKS,
  BLOCK_MAP,
  validate,
  blockSchema,
  jsonSchema,
  prompt,
  anthropicTool,
  openaiTool,
  addLabels,
  labels,
  fmtNum,
  icon,
  parseVideo,
  formationLines,
  placePlayers,
  RENDERERS,
  makeCtx,
  renderBlock,
  flatten,
  renderToString,
  parsePartial,
  blockToText,
  toText,
  jsonLd,
  jsonLdScript
};
