# Nordic Vision Science Network mockup

Static NVSN website, published at https://achetverikov.github.io/nvsn_mockup/.

The entry point is `NVSN Polar Night v2.dc.html`. The site uses hash routes
(for example, `#/members`), so links work under the GitHub Pages repository path
without server rewrites.

## GitHub Pages

In repository **Settings → Pages**, set **Source** to **GitHub Actions**.
The `Deploy GitHub Pages` workflow publishes every push to `main` and can also
be run manually from the Actions tab.

The workflow copies the entry point to `index.html` and publishes the scripts,
map, source metadata, and `assets/` directory. Archived material in `unused/`
and repository configuration are excluded from the deployment.

## Local preview

From the repository root, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/NVSN%20Polar%20Night%20v2.dc.html.
No dependency installation or compilation is required. The browser loads the
existing React/Babel runtime from unpkg and fonts from Google Fonts.
