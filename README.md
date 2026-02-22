# ALEX GAMES - Learning & Fun Portal

A pyramid-structured web portal featuring retro arcade games and interactive educational quizzes. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools.

**Live:** [alexgames.am](https://alexgames.am)
**Facebook:** [Follow Alex Games](https://www.facebook.com/61576186104908/)

---

## Site Structure (Pyramid Architecture)

```
Home (alexgames.am)
├── Entertainment (/entertainment/)
│   ├── Sonic Runner 3D    (/entertainment/games/sonic/)
│   ├── Mario Adventure    (/entertainment/games/mario/)
│   ├── Snake Classic      (/entertainment/games/snake/)
│   ├── Turbo Racing       (/entertainment/games/racing/)
│   └── Battle Tanks       (/entertainment/games/tanks/)
└── Educational (/educational/)
    └── Grammar Quizzes    (/educational/grammar-quizzes/)
        ├── Parts of Speech
        ├── Verb Tenses
        ├── Punctuation
        ├── Sentence Structure
        └── Commonly Confused Words
```

**Home page** shows two category cards. Clicking a category opens its landing page listing all items within. Each item links to the actual game or quiz.

---

## Entertainment - Retro Arcade Games

### Sonic Runner 3D
3D endless runner powered by Three.js with 15 zones, 6 weapons, 6 skins, and a shop system.

**Controls:** Space=Jump, S/Down=Spin Dash, A/X=Shoot, Left/Right=Change Lane

### Mario Adventure
2D platformer with 5 worlds, coins, power-ups (mushroom, fire flower, star), boss battles, and a character/powerup shop.

**Controls:** Arrows/A/D=Move, Space/W=Jump, Shift/S=Run, F/X=Fireball

### Snake Classic
Retro Nokia-style snake with modern power-ups, speed boosts, and progressive difficulty.

**Controls:** Arrows/WASD=Direction, Space=Pause

### Turbo Racing
Top-down 2D arcade racing with nitro boosts, drifting, and AI opponents.

**Controls:** Up/W=Gas, Down/S=Brake, Left/Right=Steer, Space=Nitro

### Battle Tanks
Battle City-style strategic tank warfare with destructible terrain, upgrades, and enemy waves.

**Controls:** Arrows/WASD=Move, Space=Fire, Escape=Pause

---

## Educational - Grammar Quizzes

5 interactive grammar quizzes, 10 multiple-choice questions each, built with a shared quiz engine.

### Quiz Topics

| Quiz | What It Tests |
|------|--------------|
| **Parts of Speech** | Nouns, verbs, adjectives, adverbs, pronouns, prepositions |
| **Verb Tenses** | Past/present/future simple, continuous, present perfect |
| **Punctuation** | Commas, apostrophes, semicolons, colons, quotation marks |
| **Sentence Structure** | Fragments, run-ons, subject-verb agreement, compound/complex sentences |
| **Commonly Confused Words** | their/there/they're, your/you're, its/it's, then/than, affect/effect, to/too |

### Gamification Features

- **Correct answer:** Green highlight + ascending chime (Web Audio API) + random happy emoji from 10 characters + encouraging phrase
- **Wrong answer:** Red shake animation + buzzer sound + funny emoji reaction + shows correct answer
- **Progress bar** and live score counter
- **Pass (7+/10):** Confetti celebration + trophy + victory fanfare
- **Fail (<7/10):** Encouraging message + specific study tips based on which topics were missed

### Quiz Engine Architecture
- `quiz-engine.js` — shared engine handling rendering, scoring, sounds, animations, results
- `style.css` — shared retro quiz styling
- Each quiz page passes its question data as a JS object to `new QuizEngine({...})`
- Sounds generated via Web Audio API (no audio files needed)
- Fully mobile-friendly with large tap targets

---

## Mobile Touch Controls

All 5 games support mobile devices with virtual on-screen controls:

| Game | D-Pad | Action Buttons |
|------|-------|---------------|
| Sonic | Left/Right | Jump, Spin, Shoot |
| Mario | Left/Right | Jump, Run, Fire |
| Snake | 4-direction + Swipe | Pause |
| Racing | 4-direction | Nitro |
| Tanks | 4-direction | Fire |

- Controls auto-detected via `@media (pointer: coarse)` — only shown on touch devices
- Canvas scales responsively to fit mobile screens
- Snake also supports swipe gestures on the canvas
- Shared `mobile-touch.js` injects controls and maps touches to each game's key system

---

## SEO

Every page includes:
- Keyword-rich `<title>` and `<meta description>`
- Open Graph tags (Facebook sharing)
- Twitter Card meta tags
- `<link rel="canonical">` URLs
- `<meta name="robots" content="index, follow">`
- Descriptive `alt` text with keywords on all images
- `aria-label` attributes for accessibility

### Schema.org Structured Data (JSON-LD)

| Page | Schemas |
|------|---------|
| Home | WebSite, Organization, BreadcrumbList, ItemList |
| Entertainment | BreadcrumbList, CollectionPage, ItemList with 5x VideoGame |
| Educational | BreadcrumbList, CollectionPage, ItemList with Quiz |
| Grammar Quizzes Hub | BreadcrumbList, ItemList with 5x Quiz |
| Each Quiz | BreadcrumbList, Quiz |

### Technical SEO Files
- `robots.txt` — allows all crawlers, references sitemap
- `sitemap.xml` — all 14 pages with priority hierarchy (1.0 home → 0.7 leaf pages)

---

## Project Files

```
alexgames.am/
├── index.html                              # Home - 2 category cards
├── CNAME                                   # Custom domain (alexgames.am)
├── robots.txt                              # Search engine crawler rules
├── sitemap.xml                             # All 14 pages for search engines
├── README.md
├── assets/
│   ├── styles/
│   │   ├── portal.css                      # Global styles + category cards
│   │   ├── game-card.css                   # Game card component
│   │   └── mobile-controls.css             # Virtual D-pad & action buttons
│   ├── js/
│   │   └── mobile-touch.js                 # Shared touch control system
│   └── images/
│       ├── game-thumbnails/
│       │   ├── sonic-thumb.svg
│       │   ├── mario-thumb.svg
│       │   ├── snake-thumb.svg
│       │   ├── racing-thumb.svg
│       │   ├── tanks-thumb.svg
│       │   ├── grammar-thumb.svg
│       │   ├── entertainment-thumb.svg
│       │   └── educational-thumb.svg
│       └── icons/
│           ├── play-icon.svg
│           └── lock-icon.svg
├── entertainment/
│   ├── index.html                          # Entertainment landing - 5 game cards
│   └── games/
│       ├── sonic/
│       │   ├── index.html
│       │   ├── game.js                     # Three.js 3D game
│       │   ├── style.css
│       │   └── sonic.svg
│       ├── mario/
│       │   ├── index.html
│       │   ├── game.js                     # 2D Canvas platformer
│       │   └── style.css
│       ├── snake/
│       │   ├── index.html
│       │   ├── game.js                     # 2D Canvas snake
│       │   └── style.css
│       ├── racing/
│       │   ├── index.html
│       │   ├── game.js                     # 2D Canvas racing
│       │   └── style.css
│       └── tanks/
│           ├── index.html
│           ├── game.js                     # 2D Canvas tank battle
│           └── style.css
└── educational/
    ├── index.html                          # Educational landing - quiz cards
    └── grammar-quizzes/
        ├── index.html                      # Quiz hub - 5 quiz cards
        ├── quiz-engine.js                  # Shared quiz logic & sounds
        ├── style.css                       # Shared quiz styling
        ├── parts-of-speech/index.html      # Quiz 1: 10 questions
        ├── tenses/index.html               # Quiz 2: 10 questions
        ├── punctuation/index.html          # Quiz 3: 10 questions
        ├── sentence-structure/index.html   # Quiz 4: 10 questions
        └── confused-words/index.html       # Quiz 5: 10 questions
```

---

## Tech Stack

- **HTML5** — semantic markup
- **CSS3** — Grid, Flexbox, Custom Properties, media queries, animations
- **JavaScript ES6+** — no frameworks
- **Three.js** — 3D rendering (Sonic game only)
- **Web Audio API** — retro sound effects (games + quizzes)
- **Google Fonts** — Press Start 2P (retro pixel font)
- **GitHub Pages** — static hosting
- **Custom domain** — alexgames.am

---

## Design System

- **Colors:** Primary blue (#0044AA), Gold (#FFD700), Cyan (#00FFFF), Red (#DD0000)
- **Font:** Press Start 2P (monospace pixel)
- **Borders:** 4px solid with offset drop shadows
- **Animations:** fadeInUp, fadeInDown, pulse, shake, confetti
- **Responsive:** Mobile (1 col) → Tablet 768px (2 col) → Desktop 1024px (3 col)

---

## Local Development

```bash
git clone https://github.com/alexpetrosyan166ithink-web/sonicgame.git
cd sonicgame
python -m http.server 8000
# Visit http://localhost:8000
```

No build step, no npm install, no dependencies to manage.

---

## Adding New Content

### Adding a Game
1. Create folder at `entertainment/games/your-game/`
2. Add `index.html`, `game.js`, `style.css`
3. Add thumbnail SVG to `assets/images/game-thumbnails/`
4. Add game card to `entertainment/index.html`
5. Add mobile touch init script after `game.js`
6. Add URL to `sitemap.xml`

### Adding a Quiz
1. Create folder at `educational/grammar-quizzes/your-quiz/`
2. Create `index.html` that loads `../quiz-engine.js` and `../style.css`
3. Call `new QuizEngine({...})` with your questions array
4. Add quiz card to `educational/grammar-quizzes/index.html`
5. Add URL to `sitemap.xml`

---

## Credits

**Development:** Alex Petrosyan
**AI Assistant:** Claude (Anthropic)
**Font:** Press Start 2P by CodeMan38
**3D Engine:** Three.js

---

<div align="center">

**Built with pixels**

[alexgames.am](https://alexgames.am)

</div>
