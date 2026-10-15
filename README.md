# Xiang Ji — Academic Portfolio

Source for [jixiang0278.github.io](https://jixiang0278.github.io), a buildless academic portfolio designed for GitHub Pages.

## Edit the profile

- Replace `assets/profile.jpg` with your own portrait. A neutral SVG placeholder is used if the file is missing.
- Edit the biography, links, research interests, Honors, and Education sections in `index.html`.
- Replace or remove entries marked `"placeholder": true` in `data/news.json`.
- Add publications to `data/publications.json` using the existing object as a template.
- Update the Person JSON-LD block and SEO metadata in `index.html` when profile details change.

## Publications and citations

The verified publication uses DOI [`10.3390/jmse14010047`](https://doi.org/10.3390/jmse14010047) and OpenAlex work ID [`W7117469142`](https://openalex.org/W7117469142). The journal citation uses volume year 2026; the article was published online on 26 December 2025.

`.github/workflows/update-stats.yml` refreshes the OpenAlex citation count and public GitHub repository statistics each Monday. The site reads `data/stats.json` first and then attempts a live, unauthenticated GitHub API refresh. A failed API call never prevents the cached site from rendering.

## Visitor analytics

GitHub does not provide a public repository-view count API. The UI therefore treats views as site visits and never invents a value. By default it reads **Not configured**.

To enable a privacy-friendly counter:

1. Create a public counter with GoatCounter, Plausible, or another static-site-compatible service.
2. Set `counterEndpoint` near the top of `script.js` to an endpoint that returns JSON with a `count` or `value` field.
3. Do not place private tokens in browser JavaScript. If your analytics provider requires a secret, keep the visitor count disabled or proxy it through a trusted service.

## Local preview

Because browsers restrict `fetch()` from `file://` pages, serve the directory locally:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## GitHub Pages

The `pages.yml` workflow deploys every push to `main`. In the repository settings, choose **GitHub Actions** under **Settings → Pages → Build and deployment → Source**. The public site will be available at `https://jixiang0278.github.io`.

The project has no framework, package manager, runtime secrets, or server dependency.
