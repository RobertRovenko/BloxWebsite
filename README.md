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
│   └── js/
│       └── script.js       # Shared scripts
└── README.md               # This file
```

## Privacy Policy Contact

- Email: rovenkodevsupport@gmail.com
- Last updated: October 16, 2026

## Notes

- No build step or framework required. Just upload the files to any static host.
- The privacy policy references AdMob ad unit `ca-app-pub-1555784587312566/6943089898` for release builds.