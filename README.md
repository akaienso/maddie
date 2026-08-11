# maddie.dog

Static photo site for Maddie. `www/static/` deploys to the main Cloudflare worker; `www/cam/` deploys separately (cam.maddie.dog).

## Adding photos

1. Drop images/videos into `www/static/assets/img/gallery/`
   (jpg, jpeg, png, webp; gif and mp4 pass through untouched)
2. Commit and push — Cloudflare's git integration runs the build

Cloudflare settings: build command `npm run build`, deploy directory `www/static`.

The build converts every photo to two WebP sizes with clean date slugs
(`2025-07-04-a-grid.webp` ~900px for the grid, `…-full.webp` ~1800px for the
lightbox, quality 80) and removes the originals from the deployed output —
originals stay safe in git. The grid uses `srcset` so browsers pick the right
size. Heads-up: running `npm run build` locally does the same conversion in
your working tree, replacing the original files there (git history keeps them).

The build script:

- Parses dates from filenames (`PXL_20250704_…`, `IMG_20251009_…`, `…2026-06-04…`) and sorts newest first; undated files sort last.
- Writes `www/static/assets/img/gallery/gallery.json` — edit `caption` (shows in the lightbox) or `alt` there; your edits survive rebuilds (matched by source filename).
- Rewrites the gallery block in `www/static/index.html` between the `<!-- gallery:start -->` / `<!-- gallery:end -->` markers.

One dependency: [sharp](https://sharp.pixelplumbing.com/) (image conversion).

## Structure

```
build.js              gallery build script
www/static/           deploy root (main site)
  index.html          landing page
  template.html       blank page template for new pages
  404.html            not-found page
  assets/css/site.css
  assets/js/gallery.js  lightbox (progressive enhancement)
  assets/img/gallery/   photos + gallery.json
www/cam/              placeholder — separate worker deployment
```

## Notes

- The page works without JavaScript; the lightbox is an enhancement (clicking a photo without JS opens the full image).
- HTML is plain and semantic (header/nav/main/section/figure/footer) for later conversion to an EtchWP template.
