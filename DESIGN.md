# KOBO design and content guide

KOBO is an unofficial information site for the fabrication workspace at Ritsumeikan University OIC. Its main jobs are to show current printer availability and to publish useful articles, examples, and event information.

## Product structure

- Printer status is live operational information. Show a compact summary near the top and link to the detailed status page.
- Upcoming events are dated information. Show them only while relevant.
- Tips, detailed making records, event reports, and news share one article system with categories.
- Works are a visual gallery. A work may optionally link to a detailed article.
- Future community submissions must be reviewed before publication. Public submission UI must not be shown until moderation and consent handling exist.

## Character

- Simple, bright, readable, and student-made.
- Use real workshop, process, and project photography.
- Prefer useful Japanese labels over decorative English or short filler copy.
- The interface should support the content rather than announce a visual theme.

## Tokens

| Role | Value |
| --- | --- |
| Text | `#171717` |
| Background | `#ffffff` |
| Subtle background | `#fafafa` |
| Border | `#e5e5e5` |
| Muted text | `#666666` |
| Link / active printer | `#2563eb` |
| Available | `#10b981` |
| Error | `#dc2626` |

- Use a legible Japanese sans-serif stack. Do not introduce a display font only for personality.
- Main content width: approximately `72rem`; article reading width: `68ch`.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 80px.
- Small corner radii are acceptable for images and controls. Avoid applying the same rounded container to every section.
- Shadows should be subtle and rare; alignment, whitespace, and borders should establish hierarchy first.

## Layout

- Keep navigation and section names literal.
- The home page order is: workshop image, compact printer status, upcoming events when present, latest articles, recent works.
- Article cards may be used because articles are repeatable content, but avoid placeholder cards and decorative statistics.
- Use one featured article followed by a simple grid or list rather than giving every article equal visual weight.
- Mobile layouts preserve the same content order and do not hide printer status.

## Content

- Content lives in `src/content/{articles,works,events}/*.md` and is edited from `/admin`. Changes to the editor must not restyle public pages; public UI follows this document.
- Article types: `guide` (how-to) and `tech` (findings, troubleshooting).
- Works have a detail page at `/works/[id]`; cards use the same quiet card style as the home page.

## Page roles

Decided in `docs/content-plan.md` (2026-10-27). Each item has one home; lists are entrances.

| Page | Holds | Event reports |
| --- | --- | --- |
| 記事 `/articles` | Guides and tech notes that stay useful (ガイド／テック) | Not listed |
| イベント `/events` | Upcoming events and the record of past ones | Their only home (`/events/[id]`) |
| Home 新着 | What was added recently, across kinds, with a kind label | Mixed in, linking to `/events/[id]` |

- Keep reports easy to reach: home 新着 mixes them in with a 「記事一覧を見る」「開催報告を見る」 pair of links, `/events` lists them in their own 開催報告 section (`#reports`), and `/articles` points there.
- Do not write an event report as a separate article. Append it to the event page. A long or multi-author write-up may be an article that links to the event.

## Events

- Upcoming events appear on the home page only while they are upcoming. Past events live on `/events`.
- An event is past when its date is before today, when it has a record (`record`), or when it is report-only (`reportOnly: true`).
- Report-only events have no announcement: the detail page shows the photo, date, place, participants, and the record only. Do not show an empty announcement block.
- For announced events, the record comes first after the event; the original announcement stays available in a collapsed section.

## Avoid

- Marketing slogans, fake metrics, and unnecessary explanatory copy.
- Decorative all-caps labels, section numbers, arrows, and status pills.
- Gradient decoration, glass effects, industrial-poster styling, and repeated floating cards.
- Separating Tips and event reports into unrelated visual systems when they are both articles.

## Review checklist

1. Can a returning visitor find printer status immediately?
2. Are upcoming and past events clearly distinguished?
3. Does every short label help navigation or understanding?
4. Are article category, title, date, and image sufficient without filler?
5. Does a work remain useful without requiring a full article?
6. Is the mobile version as direct as the desktop version?
7. Was the rendered page inspected before handoff?
