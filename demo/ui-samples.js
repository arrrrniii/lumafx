/* Sample documents for the lumafx/ui demo. The Orbit article uses the published lineup; everything
   marked "sample" uses fictional teams, players and numbers. */
window.FXUI_SAMPLES = {
  orbit: {
    lang: 'sq',
    blocks: [
      {
        type: 'match',
        id: 'alb-smr',
        competition: 'UEFA Nations League · Liga C',
        round: 'Grupi C1',
        status: 'scheduled',
        kickoff: '2026-10-06T20:45:00+02:00',
        venue: 'Air Albania, Tiranë',
        home: { name: 'Shqipëria', short: 'ALB', color: '#e41e2b' },
        away: { name: 'San Marino', short: 'SMR', color: '#4fa3d9' },
        tickets: '#bileta',
      },
      {
        type: 'details',
        title: 'Detajet e ndeshjes',
        items: [
          { label: 'Ekipet', value: 'Shqipëri – San Marino', icon: '⚽' },
          { label: 'Data', value: 'E hënë, 6 tetor 2026', icon: '📅' },
          { label: 'Ora', value: '20:45', icon: '⏱' },
          { label: 'Stadiumi', value: 'Air Albania, Tiranë', icon: '🏟' },
          { label: 'Kompeticioni', value: 'Nations League, Liga C, Grupi C1', icon: '🏆' },
        ],
      },
      {
        type: 'lineup',
        title: 'Formacioni',
        formation: '3-4-3',
        confirmed: true,
        team: { name: 'Shqipëria', kit: { shirt: '#e41e2b', sleeves: '#151515', number: '#ffffff' } },
        players: [
          { name: 'Dajsinani', number: 23, pos: 'GK' },
          { name: 'Mitaj', number: 3, pos: 'DF' },
          { name: 'Ismajli', number: 18, pos: 'DF' },
          { name: 'Gjimshiti', number: 6, pos: 'DF' },
          { name: 'Pilo', number: 22, pos: 'MF' },
          { name: 'Asllani', number: 8, pos: 'MF' },
          { name: 'Shehu', number: 16, pos: 'MF' },
          { name: 'Hysaj', number: 4, pos: 'MF' },
          { name: 'Hoxha', number: 21, pos: 'FW' },
          { name: 'Manaj', number: 7, pos: 'FW' },
          { name: 'Muçi', number: 10, pos: 'FW' },
        ],
        source: { label: 'Flashscore', url: 'https://www.flashscore.com' },
        note: 'Pozicionet janë skematike, jo të matura. Skema 3-4-3 raportohet nga Flashscore.',
      },
      {
        type: 'sources',
        verified: true,
        checked: '2026-10-07T10:06:00Z',
        items: [
          { title: 'Raporti i ndeshjes', url: 'https://fshf.org', publisher: 'FSHF' },
          { title: 'Lista e të ftuarve', url: 'https://fshf.org', publisher: 'FSHF' },
          { title: 'Formacionet', url: 'https://www.flashscore.com', publisher: 'Flashscore' },
        ],
      },
      {
        type: 'faq',
        title: 'Pyetje të shpejta',
        items: [
          { q: 'A është konfirmuar formacioni?', a: 'Po. XI zyrtar, 11 nga 11, sipas burimeve më lart.' },
          { q: 'A janë biletat për ndeshjen në Tiranë?', a: 'Po, kjo faqe ka të bëjë me ndeshjen në **Air Albania**, jo me ndeshjen në udhëtim.' },
          { q: 'Ku i shoh detajet në Sphere?', a: 'Te karta e ngjarjes më poshtë, me datën, orën dhe lidhjen për bileta.' },
        ],
      },
      {
        type: 'event',
        name: 'Shqipëri – San Marino',
        category: 'Futboll',
        start: '2026-10-06T20:45:00+02:00',
        venue: { name: 'Air Albania', city: 'Tiranë' },
        status: 'on-sale',
        url: '#bileta',
        cta: 'Bli biletën',
      },
      {
        type: 'suggestions',
        title: 'Pyet më tej',
        items: [{ text: 'Kush janë golashënuesit e Shqipërisë në këtë kualifikim?' }, { text: 'Si të shkoj te stadiumi Air Albania?' }, { text: 'Kur është ndeshja e radhës?' }],
      },
    ],
  },

  sports: {
    blocks: [
      { type: 'callout', tone: 'info', text: 'Sample data: the teams, players and numbers below are fictional.' },
      {
        type: 'match',
        id: 'live-1',
        competition: 'Sample League',
        round: 'Matchday 9',
        status: 'live',
        minute: "67'",
        home: { name: 'Arbëria FC', short: 'ARB', color: '#c8102e', form: 'WWDLW' },
        away: { name: 'Drini United', short: 'DRU', color: '#1d4ed8', form: 'LDWWD' },
        score: [2, 1],
        scorers: [
          { team: 'home', player: 'E. Krasniqi', minute: "12'" },
          { team: 'away', player: 'L. Marku', minute: "38'", type: 'penalty' },
          { team: 'home', player: 'D. Hoti', minute: "61'" },
        ],
        venue: 'Sample Arena',
        tv: 'Sample TV',
      },
      {
        type: 'group',
        layout: 'row',
        blocks: [
          {
            type: 'events',
            title: 'Timeline',
            home: 'Arbëria FC',
            away: 'Drini United',
            items: [
              { minute: "12'", team: 'home', type: 'goal', player: 'E. Krasniqi', assist: 'A. Leka', score: '1-0' },
              { minute: "27'", team: 'away', type: 'yellow', player: 'B. Doci' },
              { minute: "38'", team: 'away', type: 'penalty', player: 'L. Marku', score: '1-1' },
              { minute: 'HT', type: 'period', note: 'Half-time', score: '1-1' },
              { minute: "55'", team: 'home', type: 'sub', in: 'D. Hoti', out: 'A. Leka' },
              { minute: "61'", team: 'home', type: 'goal', player: 'D. Hoti', score: '2-1' },
              { minute: "64'", team: 'away', type: 'var', player: 'Goal check', note: 'No penalty' },
            ],
          },
          {
            type: 'match-stats',
            title: 'Team stats',
            home: 'Arbëria FC',
            away: 'Drini United',
            homeColor: '#c8102e',
            awayColor: '#1d4ed8',
            items: [
              { label: 'Possession', home: 58, away: 42, unit: '%' },
              { label: 'Shots', home: 14, away: 8 },
              { label: 'On target', home: 6, away: 3 },
              { label: 'Corners', home: 7, away: 2 },
              { label: 'Fouls', home: 9, away: 13 },
            ],
          },
        ],
      },
      {
        type: 'standings',
        title: 'Table',
        group: 'Sample League',
        highlight: 'Arbëria FC',
        rows: [
          { pos: 1, team: 'Vjosa City', played: 9, won: 7, drawn: 1, lost: 1, gd: 14, points: 22, form: 'WWWDW', zone: 'champions' },
          { pos: 2, team: 'Arbëria FC', played: 9, won: 6, drawn: 2, lost: 1, gd: 9, points: 20, form: 'WWDLW', zone: 'champions' },
          { pos: 3, team: 'Drini United', played: 9, won: 5, drawn: 2, lost: 2, gd: 5, points: 17, form: 'LDWWD', zone: 'europe' },
          { pos: 4, team: 'Shkumbini SC', played: 9, won: 4, drawn: 2, lost: 3, gd: 1, points: 14, form: 'WLDWL' },
          { pos: 5, team: 'Osumi Athletic', played: 9, won: 2, drawn: 2, lost: 5, gd: -8, points: 8, form: 'LLDWL', zone: 'playoff' },
          { pos: 6, team: 'Erzeni FC', played: 9, won: 0, drawn: 1, lost: 8, gd: -21, points: 1, form: 'LLLDL', zone: 'relegation' },
        ],
      },
      {
        type: 'group',
        layout: 'row',
        blocks: [
          {
            type: 'h2h',
            title: 'Head to head',
            home: 'Arbëria FC',
            away: 'Drini United',
            summary: { home: 6, draw: 3, away: 4 },
            matches: [
              { date: '2026-03-14', home: 'Drini United', away: 'Arbëria FC', score: '0-2', competition: 'Sample League' },
              { date: '2025-10-02', home: 'Arbëria FC', away: 'Drini United', score: '1-1', competition: 'Sample League' },
              { date: '2025-04-20', home: 'Arbëria FC', away: 'Drini United', score: '1-3', competition: 'Sample Cup' },
            ],
          },
          {
            type: 'player',
            name: 'Elion Krasniqi',
            number: 9,
            position: 'Striker',
            team: 'Arbëria FC',
            nationality: 'Sample',
            age: 24,
            stats: [
              { label: 'Goals', value: 8 },
              { label: 'Assists', value: 3 },
              { label: 'Minutes', value: 742 },
              { label: 'Rating', value: 7.6 },
            ],
          },
        ],
      },
      {
        type: 'scoreboard',
        sport: 'basketball',
        competition: 'Sample Basket League',
        status: 'live',
        clock: 'Q4 03:12',
        home: { name: 'Tomori Hawks', short: 'TOM', color: '#7c3aed' },
        away: { name: 'Butrinti Waves', short: 'BUT', color: '#0891b2' },
        periods: [
          { label: 'Q1', home: 21, away: 18 },
          { label: 'Q2', home: 19, away: 24 },
          { label: 'Q3', home: 25, away: 20 },
          { label: 'Q4', home: 14, away: 11 },
        ],
        total: [79, 73],
        leaders: [
          { team: 'home', player: 'K. Rama', stat: '24 PTS · 7 AST' },
          { team: 'away', player: 'S. Gjoni', stat: '19 PTS · 11 REB' },
        ],
      },
      {
        type: 'group',
        layout: 'row',
        blocks: [
          {
            type: 'tennis',
            tournament: 'Sample Open',
            round: 'Final',
            surface: 'clay',
            status: 'live',
            players: [
              { name: 'A. Berisha', country: 'AL', seed: 2, serving: true },
              { name: 'M. Costa', country: 'IT', seed: 5 },
            ],
            sets: [
              { a: 6, b: 4 },
              { a: 6, b: 7, tiebreak: '5-7' },
              { a: 3, b: 2 },
            ],
            points: ['40', '30'],
          },
          {
            type: 'fight',
            event: 'Sample Fight Night',
            division: 'Lightweight',
            rounds: 3,
            status: 'finished',
            fighters: [
              { name: 'Arben Kola', nickname: 'The Eagle', record: '14-2-0', country: 'AL' },
              { name: 'Marco Ruiz', record: '12-4-0', country: 'ES' },
            ],
            result: { winner: 0, method: 'KO (punches)', round: 2, time: '3:41' },
          },
        ],
      },
      {
        type: 'race',
        series: 'Sample Grand Prix',
        event: 'Round 17',
        session: 'Race',
        status: 'finished',
        rows: [
          { pos: 1, name: 'R. Vance', team: 'Crimson Racing', color: '#e8002d', time: '1:21:44.208', points: 25 },
          { pos: 2, name: 'T. Okafor', team: 'Volt Motorsport', color: '#ff8000', gap: '+3.912', points: 18 },
          { pos: 3, name: 'L. Moreau', team: 'Silver Arrow GP', color: '#27f4d2', gap: '+8.450', points: 16, fastest: true },
          { pos: 4, name: 'J. Lind', team: 'Volt Motorsport', color: '#ff8000', gap: '+15.101', points: 12 },
          { pos: 5, name: 'K. Sato', team: 'Blue Bull', color: '#3671c6', gap: '+22.783', points: 10 },
        ],
      },
      {
        type: 'bracket',
        title: 'Cup bracket',
        rounds: [
          { name: 'Semi-finals', matches: [{ a: { name: 'Vjosa City', score: 2 }, b: { name: 'Erzeni FC', score: 0 }, winner: 'a' }, { a: { name: 'Arbëria FC', score: 1 }, b: { name: 'Drini United', score: 1 } }] },
          { name: 'Final', matches: [{ a: { name: 'Vjosa City' }, b: { name: 'TBD' } }] },
        ],
      },
    ],
  },

  answers: {
    blocks: [
      {
        type: 'weather',
        location: 'Tirana',
        now: { temp: 23, condition: 'Mostly sunny', icon: 'sun', feels: 24, humidity: 48, wind: '9 km/h W' },
        hours: [
          { time: '15:00', temp: 23, icon: 'sun' },
          { time: '16:00', temp: 22, icon: 'partly' },
          { time: '17:00', temp: 21, icon: 'partly' },
          { time: '18:00', temp: 19, icon: 'cloud', rain: 20 },
          { time: '19:00', temp: 17, icon: 'rain', rain: 60 },
          { time: '20:00', temp: 16, icon: 'night' },
        ],
        days: [
          { day: 'Today', hi: 23, lo: 12, icon: 'sun' },
          { day: 'Sat', hi: 21, lo: 13, icon: 'partly', rain: 10 },
          { day: 'Sun', hi: 17, lo: 11, icon: 'rain', rain: 70 },
          { day: 'Mon', hi: 19, lo: 10, icon: 'cloud' },
        ],
        note: 'Sample forecast.',
      },
      {
        type: 'stats',
        title: 'Ticket sales (sample)',
        items: [
          { label: 'Tickets sold', value: 18420, delta: 12, period: 'vs. last match', trend: [9, 11, 10, 13, 15, 14, 18] },
          { label: 'Revenue', value: 284000, unit: '€', delta: 8.4, trend: [120, 140, 150, 170, 210, 230, 284] },
          { label: 'Refunds', value: 1.2, unit: '%', delta: -0.4, good: 'down' },
        ],
      },
      {
        type: 'chart',
        kind: 'line',
        title: 'Weekly visitors (sample)',
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          { name: 'Web', values: [820, 932, 901, 1234, 1590, 2130, 1820] },
          { name: 'App', values: [420, 510, 620, 700, 880, 1240, 1100] },
        ],
      },
      {
        type: 'group',
        layout: 'row',
        blocks: [
          { type: 'chart', kind: 'column', title: 'Goals per month (sample)', labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'], series: [{ name: 'Goals', values: [4, 7, 5, 9, 6] }] },
          { type: 'chart', kind: 'donut', title: 'Ticket types (sample)', labels: ['Standard', 'Premium', 'VIP', 'Family'], series: [{ name: 'Share', values: [62, 21, 7, 10] }] },
        ],
      },
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Getting there',
            blocks: [
              {
                type: 'steps',
                items: [
                  { title: 'Take the city bus', text: 'Lines to the stadium run every 10 minutes on match days.' },
                  { title: 'Use the east entrance', text: 'Shortest queues before kickoff.' },
                  { title: 'Show your ticket on your phone', text: 'Turn the brightness up for the scanners.' },
                ],
              },
            ],
          },
          {
            label: 'Plan the day',
            blocks: [
              {
                type: 'itinerary',
                days: [
                  { label: 'Match day', stops: [{ time: '17:00', name: 'Late lunch in Blloku' }, { time: '19:00', name: 'Walk to the stadium' }, { time: '20:45', name: 'Kickoff' }, { time: '23:00', name: 'Drinks on a rooftop' }] },
                ],
              },
            ],
          },
          {
            label: 'Quiz',
            blocks: [
              {
                type: 'quiz',
                questions: [
                  { q: 'How many players start for each team in football?', options: ['9', '10', '11'], answer: 2, explain: 'Eleven, including the goalkeeper.' },
                  { q: 'What is a hat-trick?', options: ['Three goals by one player', 'Three yellow cards', 'Three corners in a row'], answer: 0 },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'compare',
        title: 'Which pass? (sample)',
        attributes: ['Matches', 'Seat', 'Lounge', 'Parking'],
        items: [
          { name: 'Season', price: '€120', values: { Matches: 'All home', Seat: 'Fixed', Lounge: '—', Parking: '—' } },
          { name: 'Premium', price: '€290', badge: 'Popular', values: { Matches: 'All home', Seat: 'Fixed, central', Lounge: 'Half-time', Parking: '✓' } },
          { name: 'Flex', price: '€15 / match', values: { Matches: 'Pick any', Seat: 'Best available', Lounge: '—', Parking: '—' } },
        ],
      },
      {
        type: 'table',
        title: 'Top scorers (sample)',
        columns: [{ label: 'Player' }, { label: 'Team' }, { label: 'Goals', align: 'right' }, { label: 'xG', align: 'right' }],
        rows: [
          ['E. Krasniqi', 'Arbëria FC', 8, 6.4],
          ['P. Dushku', 'Vjosa City', 7, 7.9],
          ['L. Marku', 'Drini United', 6, 4.8],
        ],
        highlight: 0,
      },
      {
        type: 'places',
        title: 'Near the stadium (sample)',
        items: [
          { name: 'Sample Grill', category: 'Restaurant', price: '€€', address: 'Rruga e Kavajës', note: 'Open late on match days.' },
          { name: 'Sample Coffee', category: 'Café', price: '€', address: 'Bulevardi Dëshmorët e Kombit' },
        ],
      },
      { type: 'progress', title: 'Stadium filling (sample)', items: [{ label: 'North stand', value: 92, tone: 'warning' }, { label: 'South stand', value: 64 }, { label: 'VIP', value: 38, max: 50, tone: 'good' }] },
      { type: 'quote', text: 'The atmosphere decided the game in the last twenty minutes.', author: 'Sample reporter', role: 'Sphere Orbit' },
      { type: 'countdown', label: 'Next match', to: '2026-11-14T20:45:00+01:00' },
      { type: 'gallery', images: [{ src: 'img/theth.jpg', alt: 'Mountains' }, { src: 'img/ksamil.jpg', alt: 'Islands' }, { src: 'img/dajti.jpg', alt: 'Sunrise' }] },
      { type: 'actions', buttons: [{ label: 'Open in Sphere', url: '#', style: 'primary' }, { label: 'Share', url: '#', style: 'secondary' }] },
      { type: 'suggestions', title: 'Related', items: [{ text: 'What should I bring to the stadium?' }, { text: 'Compare ticket prices for the next three matches' }, { text: 'Plan a weekend in Tirana around the match' }] },
    ],
  },

  events: {
    blocks: [
      {
        type: 'event',
        name: 'Sunset Sessions: Closing Night',
        image: 'img/blloku.jpg',
        category: 'Electronic',
        artists: ['Sample DJ', 'Second Artist', 'Opening act'],
        start: '2026-10-24T21:00:00+02:00',
        end: '2026-10-25T04:00:00+02:00',
        venue: { name: 'Sample Rooftop', city: 'Tirana' },
        priceFrom: 25,
        currency: 'EUR',
        status: 'few-left',
        url: '#tickets',
      },
      {
        type: 'tickets',
        title: 'Choose a ticket',
        currency: 'EUR',
        url: '#checkout',
        tiers: [
          { name: 'Early bird', price: 20, status: 'sold-out' },
          { name: 'Standard', price: 25, perks: ['Entry from 21:00'] },
          { name: 'Fast lane', price: 40, perks: ['Skip the queue', 'Welcome drink'], remaining: 18 },
          { name: 'Table', price: 300, perks: ['Up to 6 guests', 'Bottle service'] },
        ],
      },
      {
        type: 'zones',
        title: 'Pick your stand (sample prices)',
        layout: 'stadium',
        currency: 'EUR',
        url: '#checkout',
        zones: [
          { id: 'west', name: 'West stand', price: 25 },
          { id: 'east', name: 'East stand', price: 20 },
          { id: 'north', name: 'North curve', price: 10, status: 'few-left' },
          { id: 'south', name: 'South curve', price: 10, status: 'sold-out' },
          { id: 'vip', name: 'VIP', price: 60 },
        ],
      },
      {
        type: 'group',
        layout: 'row',
        blocks: [
          { type: 'venue', name: 'Air Albania Stadium', city: 'Tirana', capacity: 22500, image: 'img/durres.jpg' },
          { type: 'schedule', title: 'Running order (sample)', items: [{ time: '21:00', name: 'Doors' }, { time: '22:00', name: 'Opening act', stage: 'Terrace' }, { time: '23:30', name: 'Second Artist', stage: 'Main' }, { time: '01:00', name: 'Sample DJ', stage: 'Main' }] },
        ],
      },
    ],
  },
};
