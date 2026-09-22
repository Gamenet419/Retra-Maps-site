# How to add a new product

You only edit **one file**: `products.json`. Then run the build script.

## Steps

1. **Add images** into `assets/` (hero, renders) and thumbs into `assets/thumbs/`.

2. **Open `products.json`** and copy an existing product object in the `"products"` array. Change:
   - `id` — URL anchor, e.g. `"amp-03"`
   - `short_code` — used for share post ids, e.g. `"03"`
   - `title` / `short_title` / `card_blurb` / `lede`
   - `hero` — image path, alt text, width, height
   - `specs` — list of `{ "label", "value" }`
   - `links` — fab, turbosquid, artstation, x
   - `gallery` — list of `{ "src", "thumb", "alt" }`
   - `video` — optional; use `null` if none
   - `share_post` — text people can copy
   - `layout` — `"normal"` or `"reverse"` (alternating image side)

3. **Update the site summary** at the top of `products.json` if you want:
   - `site.hero_lede` — home page subtitle
   - `site.products_lede` — products page intro

4. **Build** (from this folder):

```bash
python3 build.py
```

5. **Upload** the site as usual (or the changed HTML + assets).

## What the build updates automatically

- Home page pack cards  
- Share kit posts  
- Contact form topic options (`Question about AMP 0X`)  
- Products page jump links  
- Full product sections (specs, links, gallery, video)

Header, footer, legal pages, and styling are left alone.
