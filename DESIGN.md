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

## Article categories

- `tips`: machine and software tips
- `work`: detailed making record
- `event-report`: report after an event
- `news`: operational news and announcements

## Events

- The current event card is provisional. It places a poster image directly in a grid and does not work well when only one event is present.
- When event publishing resumes, redesign a single upcoming event as a horizontal announcement containing the event name, date, short description, and action link. Treat the poster as a supporting image, not the complete interface.
- When several events are present, switch to a compact event list or card grid without centering a lone poster merely to fill space.
- After an event, remove its promotion from the home page and preserve the outcome as an `event-report` article when appropriate.
- `public/data/events.json` currently contains a display-check dummy dated `2026-11-15`. Remove or replace it before a production release.

## Works and future submissions

- A work contains title, description, images, tags, and author.
- Optional fields support contributor type, publication status, and a related article.
- Community submissions remain `pending_review` until a moderator publishes them.
- Do not display contact details or private metadata on public work pages.

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
