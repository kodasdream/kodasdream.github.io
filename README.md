# kodasdream.github.io

Personal site for Zsombor Cservid, published with GitHub Pages at https://kodasdream.github.io/. The root page only redirects to the site under `personal/`.

- `personal/index.html`: the main page (achievements, work history, projects, skills, education, contact). Styles are in `personal/assets/site.css`.
- `personal/lifting/index.html`: a separate page with my best lifts. It is generated from `data/overview.json`, a copy of the Overview page of the Strength Sheet. To refresh it, replace the JSON and run `node tools/make-lifting.mjs`.
- `personal/Cservid_Zsombor_CV_AI_Engineer.pdf`: the CV linked from the main page. Replace the file when the CV changes.

The pages are plain HTML and CSS, with a few lines of JavaScript and no build step apart from the lifting generator.
