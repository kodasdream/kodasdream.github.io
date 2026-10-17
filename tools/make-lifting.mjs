// Builds lifting/index.html from data/overview.json, a copy of the Overview page of the Strength Sheet.
// Run from the repo root: node tools/make-lifting.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { source, lifts } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'overview.json'), 'utf8'));

// The five lifts at the top, in this order. "sheet" is the name on the Overview page.
const FEATURED = [
  { sheet: 'Leg Extensions', label: 'Leg extension' },
  { sheet: 'Squat', label: 'Squat' },
  { sheet: 'Deadlift', label: 'Deadlift' },
  { sheet: 'Flat bench', label: 'Bench press', note: 'Flat bench on the sheet' },
  { sheet: 'Overhead Press', label: 'Overhead press' },
];
const PARTS = ['Legs', 'Back', 'Chest', 'Shoulders', 'Biceps', 'Triceps', 'Forearms'];

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (value) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
const lb = (kg) => Math.round(kg * 2.2046226218).toLocaleString('en-GB');
const setLine = (lift) => (lift.kg === 0 ? `${lift.reps} reps, bodyweight` : `${lift.reps} × ${num(lift.kg)} kg`);
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const featured = FEATURED.map((item) => {
  const lift = lifts.find((entry) => entry.sheet === item.sheet);
  if (!lift) throw new Error(`Featured lift not on the sheet: ${item.sheet}`);
  return { lift, item };
});
const featuredSheets = new Set(FEATURED.map((item) => item.sheet));
const rest = lifts
  .filter((lift) => !featuredSheets.has(lift.sheet))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
const partsShown = PARTS.filter((part) => rest.some((lift) => lift.part === part));

const bigCard = ({ lift, item }, index) => `
        <article class="big raised${index === 0 ? ' feature' : ''}">
          <div class="big-head">
            <p class="tag">${esc(lift.kind)} · ${esc(lift.part)}</p>
            <h3>${esc(item.label)}</h3>
          </div>
          <div class="readout well">
            <p class="digits">${num(lift.est)}</p>
            <p class="unit">kg, estimated 1RM</p>
            <p class="lb">${lb(lift.est)} lb</p>
          </div>
          <dl class="big-facts">
            <div><dt>Best set</dt><dd>${setLine(lift)}</dd></div>
            <div><dt>Basis</dt><dd>${lift.reps === 1 ? 'Tested single' : 'Estimate from this set'}</dd></div>
          </dl>
          ${item.note ? `<p class="note">${esc(item.note)}.</p>` : ''}
        </article>`;

const liftCard = (lift) => `
          <li class="lift raised" data-part="${esc(lift.part)}" data-search="${esc(`${lift.name} ${lift.kind} ${lift.part}`.toLowerCase())}">
            <div class="lift-top">
              <h3>${esc(lift.name)}</h3>
              <span class="tag-kind">${esc(lift.kind)}</span>
            </div>
            <p class="lift-set">${setLine(lift)}${lift.reps === 1 ? '<span class="badge">Tested</span>' : ''}</p>
            <p class="lift-est"><b>${num(lift.est)}</b><span>kg est. 1RM · ${lb(lift.est)} lb</span></p>
          </li>`;

const filterButtons = [
  '<button type="button" data-filter="all" aria-pressed="true">All</button>',
  ...partsShown.map((part) => `<button type="button" data-filter="${part}" aria-pressed="false">${part}</button>`),
].join('\n          ');

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Best lifts, Zsombor Cservid</title>
  <meta name="description" content="Best sets and estimated one-rep maxes from the Overview page of my Strength Sheet.">
  <meta name="theme-color" content="#08080a">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="../assets/site.css">
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>

  <header class="topbar">
    <div class="wrap bar">
      <a class="brand" href="../">
        <span class="monogram" aria-hidden="true">ZC</span>
        <span class="brand-name">Zsombor Cservid</span>
      </a>
      <nav aria-label="Pages">
        <a href="../">Main page</a>
        <a href="#all-lifts">All lifts</a>
      </nav>
    </div>
  </header>

  <main id="main" class="wrap">
    <section class="hero raised single" aria-labelledby="lift-title">
      <span class="screw s-tl" aria-hidden="true"></span>
      <span class="screw s-tr" aria-hidden="true"></span>
      <span class="screw s-bl" aria-hidden="true"></span>
      <span class="screw s-br" aria-hidden="true"></span>
      <div class="hero-copy">
        <p class="eyebrow"><span class="led" aria-hidden="true"></span>Lifting</p>
        <h1 id="lift-title">Best lifts</h1>
        <p class="lede">Competitive bodybuilder and powerlifter. Leg extension world record holder. These are my best sets and estimated one-rep maxes from the Overview page of my Strength Sheet.</p>
        <p class="meta">${lifts.length} lifts · last changed on the sheet ${longDate(source.changed)}</p>
      </div>
    </section>

    <section class="block" aria-labelledby="top-title">
      <header class="head">
        <p class="kicker">Top five</p>
        <h2 id="top-title">The big five</h2>
      </header>
      <div class="big-grid">${featured.map(bigCard).join('')}
      </div>
    </section>

    <section class="block" id="all-lifts" aria-labelledby="all-title">
      <header class="head">
        <p class="kicker">All lifts</p>
        <h2 id="all-title">The other ${rest.length}</h2>
      </header>
      <div class="toolbar">
        <label class="search well">
          <span class="sr-only">Search lifts</span>
          <input type="search" id="lift-search" placeholder="Search lifts" autocomplete="off">
        </label>
        <div class="filters" role="group" aria-label="Filter by body part">
          ${filterButtons}
        </div>
      </div>
      <p class="count" id="lift-count" aria-live="polite">${rest.length} lifts shown</p>
      <ul class="lift-grid">${rest.map(liftCard).join('')}
      </ul>
    </section>

    <section class="block" aria-labelledby="notes-title">
      <div class="card raised notes">
        <h2 id="notes-title">How to read these numbers</h2>
        <ul class="plain">
          <li><strong>Best set</strong> is the reps and kg on the Overview page for that lift.</li>
          <li><strong>Estimated 1RM</strong> is the sheet's own figure. Most come from the Epley formula, weight × (1 + reps ÷ 30), and estimates from sets above about 12 reps tend to run high.</li>
          <li><strong>Tested</strong> means a single: squat, deadlift, triceps pushdown, French bar curl and grip.</li>
          <li><strong>Bodyweight</strong> lifts (dips, push-ups, pull-ups) use the sheet's own estimate, not added weight.</li>
        </ul>
        <p class="note">Copied from the Strength Sheet on ${longDate(source.copied)}. The sheet was last changed on ${longDate(source.changed)}.</p>
      </div>
    </section>
  </main>

  <footer class="wrap foot">
    <p>© 2026 Zsombor Cservid</p>
    <p><a href="../">Main page</a></p>
  </footer>

  <script>
    var search = document.getElementById('lift-search');
    var count = document.getElementById('lift-count');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.filters button'));
    var items = Array.prototype.slice.call(document.querySelectorAll('.lift-grid > li'));
    var part = 'all';

    function apply() {
      var query = search.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (item) {
        var match = (part === 'all' || item.dataset.part === part) && (!query || item.dataset.search.indexOf(query) !== -1);
        item.hidden = !match;
        if (match) shown += 1;
      });
      count.textContent = shown + (shown === 1 ? ' lift shown' : ' lifts shown');
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        part = button.dataset.filter;
        buttons.forEach(function (other) {
          other.setAttribute('aria-pressed', String(other === button));
        });
        apply();
      });
    });
    search.addEventListener('input', apply);
    apply();
  </script>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'lifting'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'lifting', 'index.html'), page);
console.log(`Wrote lifting/index.html: ${featured.length} featured lifts, ${rest.length} more.`);
