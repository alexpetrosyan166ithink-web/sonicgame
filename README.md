# 🎮 ALEX GAMES - Retro Arcade Collection

A nostalgic gaming portal featuring classic arcade-style games built with modern web technologies. Experience the golden age of gaming with pixel-perfect graphics, retro soundtracks, and addictive gameplay.

🌐 **Live Demo:** [alexgames.am](https://alexgames.am)

---

## 🕹️ Featured Games

### ⚡ Sonic Runner 3D - **[PLAY NOW](https://alexgames.am/games/sonic/)**
A fast-paced 3D endless runner featuring everyone's favorite blue hedgehog!

**Features:**
- 🎨 Next-gen 3D graphics powered by Three.js
- 🏃 15 challenging zones with increasing difficulty
- 💫 Ball Mode for 2X speed boosts
- 🔫 6 unique weapons (Ring Shot, Fireball, Lightning, Laser, Star, Ice)
- 👕 6 customizable skins with special powers
- 🏆 Collectible rings and power-ups
- 🎵 Retro chip-tune soundtrack
- 💾 Progress saving with localStorage

**Controls:**
- `SPACE` or `CLICK` - Jump
- `S` or `DOWN ARROW` - Ball Mode (2X Speed)
- `A` or `X` - Shoot Energy Rings
- `LEFT/RIGHT ARROWS` - Move Between Lanes

### 🍄 Mario Adventure - *Coming Soon*
Classic platformer action with coins, power-ups, and epic boss battles.

### 🐍 Snake Classic - *Coming Soon*
The legendary mobile game returns with modern twists and power-ups.

### 🏎️ Turbo Racing - *Coming Soon*
High-speed arcade racing with drifting, boosts, and multiplayer support.

### 🛡️ Battle Tanks - *Coming Soon*
Strategic tank warfare with destructible terrain and upgrades.

---

## ✨ Features

### Portal Features
- 📱 **Fully Responsive Design** - Works seamlessly on mobile, tablet, and desktop
- 🎨 **Retro Aesthetic** - Authentic pixel art and classic gaming vibes
- 🎯 **Interactive Game Cards** - Hover effects and smooth animations
- 🚀 **Fast Loading** - Zero dependencies, vanilla CSS only
- 🔗 **Breadcrumb Navigation** - Easy navigation between games and portal
- 💫 **Progressive Enhancement** - Add new games easily

### Technical Features
- ⚡ Static site hosted on GitHub Pages
- 🎮 No build process required
- 🎨 Modern CSS (Grid, Flexbox, Custom Properties)
- 📐 Mobile-first responsive design
- 🖼️ SVG graphics for crisp visuals
- 💾 Local storage for game progress
- 🎵 Web Audio API for sound effects

---

## 🛠️ Tech Stack

**Frontend:**
- HTML5
- CSS3 (Vanilla - no frameworks)
  - CSS Grid for responsive layouts
  - CSS Custom Properties for theming
  - Flexbox for component layouts
- JavaScript (ES6+)
- Three.js (3D rendering for Sonic game)

**Typography:**
- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) - Authentic retro pixel font

**Hosting:**
- GitHub Pages
- Custom domain: `alexgames.am`

---

## 📁 Project Structure

```
alexgames.am/
├── index.html                      # Portal landing page
├── CNAME                           # Custom domain configuration
├── assets/
│   ├── styles/
│   │   ├── portal.css             # Global portal styles
│   │   └── game-card.css          # Game card component
│   └── images/
│       ├── game-thumbnails/       # Game preview images
│       │   ├── sonic-thumb.svg
│       │   ├── mario-thumb.svg
│       │   ├── snake-thumb.svg
│       │   ├── racing-thumb.svg
│       │   └── tanks-thumb.svg
│       └── icons/
│           ├── play-icon.svg      # Play button icon
│           └── lock-icon.svg      # Coming soon icon
├── games/
│   ├── sonic/                     # Sonic Runner 3D (playable)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── sonic.svg
│   ├── mario/                     # Coming soon placeholder
│   │   └── index.html
│   ├── snake/                     # Coming soon placeholder
│   │   └── index.html
│   ├── racing/                    # Coming soon placeholder
│   │   └── index.html
│   └── tanks/                     # Coming soon placeholder
│       └── index.html
└── README.md
```

---

## 🎯 Design Philosophy

### Retro Gaming Aesthetic
- **Color Palette:** Deep blues, gold accents, cyan highlights
- **Typography:** Monospace pixel fonts with text shadows
- **Borders:** Thick 4px borders with drop shadows
- **Animations:** Smooth transitions with retro feel

### Responsive Breakpoints
- **Mobile:** 320px-767px (1 column)
- **Tablet:** 768px-1023px (2 columns)
- **Desktop:** 1024px+ (3 columns)

---

## 🚀 Quick Start

### Playing Games
1. Visit [alexgames.am](https://alexgames.am)
2. Click on any game card with "PLAY NOW" status
3. Enjoy!

### Local Development
```bash
# Clone the repository
git clone https://github.com/alexpetrosyan166ithink-web/sonicgame.git

# Navigate to project
cd sonicgame

# Open in browser (no build step needed!)
# Just open index.html in your browser
# Or use a simple HTTP server:
python -m http.server 8000
# Then visit http://localhost:8000
```

---

## 🎮 Game Development Guide

### Adding a New Game

1. **Create game directory:**
   ```bash
   mkdir -p games/your-game-name
   ```

2. **Add game files:**
   ```
   games/your-game-name/
   ├── index.html
   ├── game.js
   └── style.css
   ```

3. **Create thumbnail:**
   - Add `your-game-thumb.svg` to `assets/images/game-thumbnails/`
   - Recommended size: 400x300px aspect ratio

4. **Update portal:**
   - Edit `index.html`
   - Change game card from "coming-soon" to "playable"
   - Update `href` to point to your game directory

5. **Add breadcrumb navigation:**
   ```html
   <div class="breadcrumb">
       <a href="../../">← BACK TO GAMES</a>
   </div>
   ```

---

## 📊 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** - Open an issue describing the problem
2. **Suggest features** - Share your ideas for new games or features
3. **Submit pull requests** - Contribute code improvements
4. **Share feedback** - Let us know what you think!

### Development Guidelines
- Maintain retro gaming aesthetic
- Keep code simple and readable
- No build dependencies (keep it static!)
- Test on mobile devices
- Follow existing code style

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🎨 Credits

**Development:** Alex Petrosyan
**AI Assistant:** Claude Sonnet 4.5 (Anthropic)

**Fonts:**
- Press Start 2P by CodeMan38

**Libraries:**
- Three.js for 3D rendering

**Inspiration:**
- Classic Sonic the Hedgehog games
- Retro arcade gaming culture
- 8-bit and 16-bit era graphics

---

## 🔮 Roadmap

### Phase 1 - Current ✅
- [x] Portal landing page
- [x] Sonic Runner 3D (fully playable)
- [x] Responsive design
- [x] Custom domain setup
- [x] Coming soon placeholders

### Phase 2 - Near Future
- [ ] Mario Adventure game
- [ ] Snake Classic game
- [ ] High scores leaderboard
- [ ] Sound effects toggle
- [ ] Favicon and meta tags

### Phase 3 - Future Plans
- [ ] Racing game
- [ ] Tanks game
- [ ] Multiplayer support
- [ ] Achievement system
- [ ] User profiles
- [ ] Game statistics dashboard

---

## 📞 Contact

**Website:** [alexgames.am](https://alexgames.am)
**GitHub:** [View Repository](https://github.com/alexpetrosyan166ithink-web/sonicgame)

---

## 🎉 Acknowledgments

Thanks to all retro gaming enthusiasts who inspired this project. Special thanks to the open-source community for amazing tools and libraries.

---

<div align="center">

**Built with ❤️ and pixels**

⭐ Star this repo if you enjoyed playing!

</div>
