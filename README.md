# kodasdream.github.io

Personal site for Zsombor Cservid, published with GitHub Pages at https://kodasdream.github.io/.

- `index.html`: the main page (achievements, work history, projects, skills, education, contact). Styles are in `assets/site.css`.
- `lifting/index.html`: a separate page with my best lifts. It is generated from `data/overview.json`, a copy of the Overview page of the Strength Sheet. To refresh it, replace the JSON and run `node tools/make-lifting.mjs`.
- `Cservid_Zsombor_CV_AI_Engineer.pdf`: the CV linked from the main page. Replace the file when the CV changes.

The main page has no build step: plain HTML, CSS and a few lines of JavaScript.
