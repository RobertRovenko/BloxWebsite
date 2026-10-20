# bloxwebsite

Website for the game **Blox** — a block puzzle game for Android.

## Deployment

This is a static site (HTML/CSS/JS only). It is intended to be hosted on the subdomain path:

```
rovenkodev/blocks
```

- Home page: `rovenkodev/blocks/` → `index.html`
- Privacy policy: `rovenkodev/blocks/privacypolicy` → `privacypolicy.html`

If your host serves directory indexes, `privacypolicy.html` will be reachable at `/privacypolicy` (without the `.html` extension) depending on your server configuration. Otherwise, link directly to `privacypolicy.html`.

## Project Structure

```
bloxwebsite/
├── index.html              # Landing page
├── privacypolicy.html      # Privacy policy page (/privacypolicy)
├── assets/
│   ├── css/
│   │   └── style.css       # Shared styles
│   ├── img/                # Generated hero + icon assets (see below)
│   └── js/
│       └── script.js       # Shared scripts
├── tools/
│   ├── generate-assets.js  # Wordmark + icons, derived from the master PNGs
│   └── generate-hero-art.js # Hand-authored vector hero artwork (inlined into index.html)
├── favicon.png             # Master source for the app icon
├── Glossy BLOX BREAK! Puzzle Banner 1.png   # Master reference for the hero art
├── Glossy 3D BLOX BREAK Logo.png            # Master source for the wordmark
└── README.md               # This file
```

## Colour scheme

The whole site is themed from the hero artwork, so the page and the banner read as one
thing:

- **Ground** — the banner's navy (`#01254a`) anchors the hero; the page below uses a
  deep navy gradient (`--bg-0` / `--bg-1`) with the same hue family.
- **Accents** — the four swoosh colours (green `#24cc48`, yellow `#fcd824`, red
  `#fc3c48`, blue `#189cfc`) and the block colours (orange, cyan, purple) are used
  for links, icons, step numbers and card highlights.
- **Plastic blocks** — the piece showcase uses the same gradient faces and an inner
  bevel filter as the hero blocks, so the tiles look moulded rather than flat.

Colours live in `:root` as custom properties, so the theme can be re-tuned in one place.
Text and fill contrast is kept at or above WCAG AA — the deep tones used behind white
button text are separate variables (`--blue-deep`, `--blue-deep-2`).

## Hero Banner

The hero is a recreation of the glossy "BLOX BREAK!" banner, built from scratch:

- The **artwork is inline SVG** in `index.html` — hand-authored vector (not traced from the
  raster): the navy ground, the four corner swooshes, and the glossy 3D blocks. Each block
  is a *single merged path*, so the cells have no seams between them.
- The SVG is inlined rather than linked so the individual blocks can be transformed
  independently for the **pointer interaction** — each block carries a `data-depth`
  (0 = far, 1 = near). Moving the cursor pushes the blocks away from the pointer,
  shifts them by depth for a parallax feel, tilts them as if they had weight, and
  lifts the nearest one. A soft spotlight follows the cursor across the artwork.
- The blocks are **completely still until the pointer moves** — there is no idle or
  ambient animation.
- The pointer effect is gated on the *input device* (mouse/pen events), not on
  `(hover: hover) and (pointer: fine)` — that media query reports the *primary*
  pointer, so it is false on touchscreen laptops, tablets in desktop mode and some
  Wayland setups, which would silently disable the whole effect. It is still
  disabled for `prefers-reduced-motion` users.
- The block transforms are SVG *user units*, so `script.js` computes the effect in
  screen pixels and converts back — otherwise the same shift would look large on
  desktop and almost invisible on a phone.
- Two art directions, switched with a media query: **desktop** `1024x520` (wide) and
  **mobile** `760x1000` (portrait). Phones get a tall poster-style composition rather than
  a squashed landscape one — the swooshes hug the four corners and stop short of the centre
  column, so the wordmark sits in the upper third and the CTA row in the lower third, both
  on clean navy.
- `assets/img/wordmark.webp` is the one raster element — the 3D "BLOX BREAK!" letterforms
  cannot be expressed as flat vector without losing the glossy plastic look. It is cut
  from `Glossy 3D BLOX BREAK Logo.png` with the alpha channel quantised (WebP stores alpha
  losslessly, so this cuts the file roughly 3x with no visible loss).

The hero is layered: vector artwork at the back, the wordmark centred over it, and the
"Download on Google Play" / "See the pieces" buttons on the artwork's own navy shelf.
The artwork runs straight into the "Base pieces" section below it — there is no separate
copy band under the hero.

### Regenerating the assets

```
node tools/generate-hero-art.js   # rewrites the inline hero SVG in index.html
node tools/generate-assets.js      # rewrites the wordmark + icons from the master PNGs
```

Both require Chrome (set `CHROME_PATH` if it is not in the default puppeteer cache location).
`generate-hero-art.js` edits the SVG in place, between `<!-- hero-art:desktop -->` and
`<!-- /hero-art:mobile -->` markers in `index.html`.

## Privacy Policy Contact

- Email: rovenkodevsupport@gmail.com
- Last updated: October 16, 2026

## Notes

- No build step or framework required. Just upload the files to any static host.
- The privacy policy references AdMob ad unit `ca-app-pub-1555784587312566/6943089898` for release builds.