#!/usr/bin/env python3
"""
Retra Maps product builder
--------------------------
Edit products.json, then run:

    python3 build.py

This rewrites the product sections in index.html and products.html from the JSON.
Everything else on the site is left alone.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "products.json"


def esc(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def replace_block(html: str, name: str, content: str) -> str:
    """Replace <!-- BUILD:name --> ... <!-- /BUILD:name --> with new content."""
    pattern = re.compile(
        rf"(<!-- BUILD:{re.escape(name)} -->)(.*?)(<!-- /BUILD:{re.escape(name)} -->)",
        re.DOTALL,
    )
    if not pattern.search(html):
        raise SystemExit(f"Missing BUILD markers for '{name}' in HTML. Re-run setup or check the file.")
    return pattern.sub(rf"\1\n{content}\n\3", html)


def load_data() -> dict:
    if not DATA_FILE.exists():
        raise SystemExit(f"Missing {DATA_FILE.name}. Create it first.")
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def hero_style(hero: dict) -> str:
    pos = hero.get("object_position")
    return f' style="object-position: {esc(pos)};"' if pos else ""


def render_pack_cards(products: list) -> str:
    cards = []
    for i, p in enumerate(products):
        delay = f' style="--reveal-delay:{0.12 * i:.2f}s"' if i else ""
        h = p["hero"]
        cards.append(
            f'''      <article class="pack-card" data-reveal{delay}>
        <img src="{esc(h["src"])}" alt="{esc(h["alt"])}" width="{h["width"]}" height="{h["height"]}" loading="lazy" decoding="async"{hero_style(h)}>
        <div class="pack-card-body">
          <h3><a href="products.html#{esc(p["id"])}">{esc(p["title"])}</a></h3>
          <p>{esc(p["card_blurb"])}</p>
          <span class="more" aria-hidden="true">View {esc(p["short_title"])}</span>
        </div>
      </article>'''
        )
    return "\n".join(cards)


def render_share_cards(products: list) -> str:
    cards = []
    for i, p in enumerate(products):
        delay = f' style="--reveal-delay:{0.12 * i:.2f}s"' if i else ""
        code = p["short_code"]
        post_id = f"post-{code}"
        status_id = f"status-{code}"
        cards.append(
            f'''      <div class="share-card" data-reveal{delay}>
        <h3>{esc(p["short_title"])} post</h3>
        <pre id="{post_id}">{esc(p["share_post"])}</pre>
        <button class="btn btn-small" type="button" data-copy-target="{post_id}" data-copy-status="{status_id}">Copy {esc(p["short_title"])} post</button>
        <span id="{status_id}" class="copy-status" role="status" aria-live="polite"></span>
      </div>'''
        )
    return "\n".join(cards)


def render_topic_options(products: list) -> str:
    lines = ['          <option>General question</option>']
    for p in products:
        lines.append(f'          <option>Question about {esc(p["short_title"])}</option>')
    lines.extend(
        [
            "          <option>Problem with a file</option>",
            "          <option>Custom terrain work</option>",
            "          <option>Data deletion request</option>",
        ]
    )
    return "\n".join(lines)


def render_product_nav(products: list) -> str:
    items = [
        f'    <li><a class="btn" href="#{esc(p["id"])}">{esc(p["title"])}</a></li>'
        for p in products
    ]
    return "\n".join(items)


def render_gallery(p: dict) -> str:
    items = []
    for i, shot in enumerate(p.get("gallery") or []):
        delay = (i % 3) * 0.07
        items.append(
            f'<li data-reveal="zoom" style="--reveal-delay:{delay:.2f}s">'
            f'<a class="shot" data-gallery="{esc(p["id"].replace("-", ""))}" href="{esc(shot["src"])}">'
            f'<img src="{esc(shot["thumb"])}" alt="{esc(shot["alt"])}" width="720" height="405" loading="lazy" decoding="async">'
            f"</a></li>"
        )
    return "\n".join(items)


def render_specs(p: dict) -> str:
    rows = [
        f'<div><dt>{esc(s["label"])}</dt><dd>{esc(s["value"])}</dd></div>'
        for s in p.get("specs") or []
    ]
    return "\n".join(rows)


def render_links(p: dict) -> str:
    links = p.get("links") or {}
    order = [
        ("fab", "Fab listing"),
        ("turbosquid", "TurboSquid"),
        ("artstation", "ArtStation"),
        ("x", "X"),
    ]
    items = []
    for key, label in order:
        url = links.get(key)
        if not url:
            continue
        items.append(
            f'  <li><a class="btn btn-small" href="{esc(url)}" target="_blank" rel="noopener">{esc(label)}'
            f'<span class="visually-hidden"> (opens in a new tab)</span></a></li>'
        )
    return "\n".join(items)


def render_video(p: dict) -> str:
    v = p.get("video")
    if not v:
        return ""
    return f'''    <h3 id="{esc(p["id"])}-video" data-reveal>{esc(v["title"])}</h3>
    <div class="video-wrap" data-reveal>
      <video controls preload="metadata" poster="{esc(v["poster"])}" aria-describedby="{esc(p["id"])}-video-desc">
        <source src="{esc(v["src"])}" type="video/mp4">
        Your browser cannot play this video. <a href="{esc(v["src"])}">Download the MP4 file</a>.
      </video>
    </div>
    <p id="{esc(p["id"])}-video-desc" class="small-print video-desc">{esc(v["description"])}</p>
'''


def render_product_section(p: dict, index: int) -> str:
    reverse = p.get("layout") == "reverse" or index % 2 == 1
    pack_class = "pack pack--reverse" if reverse else "pack"
    fig_dir = "right" if reverse else "left"
    body_dir = "left" if reverse else "right"
    h = p["hero"]
    title_id = p["id"].replace("-", "") + "-title"
    gallery_id = p["id"].replace("-", "") + "-renders"

    return f'''<section id="{esc(p["id"])}" class="{pack_class}" aria-labelledby="{title_id}">
  <div class="container pack-grid">
    <figure class="pack-figure" data-reveal="{fig_dir}">
      <img src="{esc(h["src"])}" alt="{esc(h["alt"])}" width="{h["width"]}" height="{h["height"]}"{hero_style(h)} decoding="async"{'' if index == 0 else ' loading="lazy"'}>
    </figure>
    <div class="pack-body" data-reveal="{body_dir}">
      <h2 id="{title_id}">{esc(p["title"])}</h2>
      <p class="lede">{esc(p["lede"])}</p>
      <dl class="specs">
{render_specs(p)}
</dl>
      <ul class="links">
{render_links(p)}
</ul>
      <p class="small-print" style="margin-top:1.25rem">Specs match the store listing. Confirm the files and the license on the store before you buy.</p>
    </div>
  </div>
  <div class="container">
{render_video(p)}
    <h3 id="{gallery_id}" data-reveal>{esc(p["short_title"])} renders</h3>
    <p class="small-print">{esc(p.get("gallery_note") or "Select an image to view it larger. Arrow keys move between images.")}</p>
    <ul class="gallery">
{render_gallery(p)}
</ul>
  </div>
</section>'''


def render_all_product_sections(products: list) -> str:
    return "\n\n".join(render_product_section(p, i) for i, p in enumerate(products))


def update_hero_lede(html: str, lede: str) -> str:
    # Optional: only if BUILD markers exist for it
    if "<!-- BUILD:hero_lede -->" in html:
        return replace_block(html, "hero_lede", f"    <p class=\"lede\">{esc(lede)}</p>")
    return html


def update_products_lede(html: str, lede: str) -> str:
    if "<!-- BUILD:products_lede -->" in html:
        return replace_block(html, "products_lede", f'  <p class="lede">{esc(lede)}</p>')
    return html


def ensure_markers_index(html: str) -> str:
    """If markers are missing (first run on plain HTML), inject them around known blocks."""
    if "<!-- BUILD:pack_cards -->" in html:
        return html

    # pack cards
    html = re.sub(
        r'(<div class="pack-cards">)(.*?)(</div>\s*</div>\s*</section>\s*<section id="share")',
        r'\1\n<!-- BUILD:pack_cards -->\2<!-- /BUILD:pack_cards -->\n    \3',
        html,
        count=1,
        flags=re.DOTALL,
    )
    # share grid
    html = re.sub(
        r'(<div class="share-grid">)(.*?)(</div>\s*</div>\s*</section>\s*<section id="contact")',
        r'\1\n<!-- BUILD:share_cards -->\2<!-- /BUILD:share_cards -->\n    \3',
        html,
        count=1,
        flags=re.DOTALL,
    )
    # topic select options
    html = re.sub(
        r'(<select id="f-topic" name="topic">)(.*?)(</select>)',
        r'\1\n<!-- BUILD:topic_options -->\2<!-- /BUILD:topic_options -->\n        \3',
        html,
        count=1,
        flags=re.DOTALL,
    )
    return html


def ensure_markers_products(html: str) -> str:
    if "<!-- BUILD:product_sections -->" in html:
        return html

    html = re.sub(
        r'(<ul class="actions">)(.*?)(</ul>\s*</div>)',
        r'\1\n<!-- BUILD:product_nav -->\2<!-- /BUILD:product_nav -->\n  \3',
        html,
        count=1,
        flags=re.DOTALL,
    )
    html = re.sub(
        r'(</div>\s*\n\s*)(<section id="amp-02".*?)(<dialog id="lightbox")',
        r'\1<!-- BUILD:product_sections -->\n\2\n<!-- /BUILD:product_sections -->\n\n\3',
        html,
        count=1,
        flags=re.DOTALL,
    )
    return html


def main() -> None:
    data = load_data()
    products = data.get("products") or []
    if not products:
        raise SystemExit("products.json has no products.")

    site = data.get("site") or {}

    index_path = ROOT / "index.html"
    products_path = ROOT / "products.html"

    index_html = ensure_markers_index(index_path.read_text(encoding="utf-8"))
    products_html = ensure_markers_products(products_path.read_text(encoding="utf-8"))

    index_html = replace_block(index_html, "pack_cards", render_pack_cards(products))
    index_html = replace_block(index_html, "share_cards", render_share_cards(products))
    index_html = replace_block(index_html, "topic_options", render_topic_options(products))
    if site.get("hero_lede"):
        # update hero lede text if present without markers
        index_html = re.sub(
            r'(<p class="lede">)(.*?)(</p>\s*<p class="actions">)',
            rf'\1{esc(site["hero_lede"])}\3',
            index_html,
            count=1,
            flags=re.DOTALL,
        )

    products_html = replace_block(products_html, "product_nav", render_product_nav(products))
    products_html = replace_block(products_html, "product_sections", render_all_product_sections(products))
    if site.get("products_lede"):
        products_html = re.sub(
            r'(<div class="container page-head">\s*<h1>Products</h1>\s*<p class="lede">)(.*?)(</p>)',
            rf'\1{esc(site["products_lede"])}\3',
            products_html,
            count=1,
            flags=re.DOTALL,
        )

    index_path.write_text(index_html, encoding="utf-8")
    products_path.write_text(products_html, encoding="utf-8")

    print(f"Built {len(products)} product(s) into index.html and products.html")
    for p in products:
        print(f"  - {p['id']}: {p['title']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Build failed: {e}", file=sys.stderr)
        sys.exit(1)
