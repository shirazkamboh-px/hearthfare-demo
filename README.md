# Hearthfare — static site

Marketing pages plus the `app/` platform screens. No build step: Netlify
publishes the repo root as-is (build command empty, publish directory `.`).

- Production: https://hearthfare-demo.netlify.app
- Deploy Previews are generated per pull request; open one to leave feedback
  in the Netlify Drawer at the bottom of the page.

## Layout

| Path | What it is |
|------|------------|
| `index.html`, `for-cooks.html`, `how-it-works.html`, `why-hearthfare.html`, `whats-cooking.html`, `login.html`, `signup.html` | Marketing pages |
| `styles.css` | Shared stylesheet for the marketing pages |
| `app/` | Platform screens (`cook-`, `shop-`, `customer-`, `admin-`, `app-`), with their own copy of `styles.css` plus `app.css` |
| `assets/`, `app/assets/` | Images and icons |

## Not in this repo

Internal planning docs (`docs/`, `*.docx`, the root `*.md` plans) are
gitignored on purpose — anything committed here is published to the public
site.
