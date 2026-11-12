#!/usr/bin/env python3
"""Builds personal-work/ from personal/: the same site without ColoRogue or the itch.io link
(itch.io lists ColoRogue). Rerun after every edit to personal/index.html."""
import re, shutil, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src, dst = root / "personal", root / "personal-work"
s = (src / "index.html").read_text()

def drop(pattern, n=1):
    global s
    s, k = re.subn(pattern, "", s, flags=re.S)
    assert k == n, (pattern, k)

s = s.replace(" I also make ColoRogue, a solo deckbuilder roguelike.", "")
drop(r'\n *<a class="linkcard" href="[^"]*(?:ColoRogue|colorogue|y36dCe4mAJ|itch\.io)[^\n]*', 4)
drop(r'\n *<article class="card raised">\s*<p class="eyebrow">Game</p>\s*<h3>ColoRogue</h3>.*?</article>\n')
drop(r'\n *<div class="row">\s*<span class="eyebrow">(?:itch\.io|ColoRogue Discord|ColoRogue YouTube)</span>.*?</div>', 3)
s = s.replace("https://kodasdream.github.io/personal/", "https://kodasdream.github.io/personal-work/")
s = s.replace('href="lifting/"', 'href="../personal/lifting/"')
s = s.replace('href="assets/', 'href="../personal/assets/').replace('href="favicon.svg"', 'href="../personal/favicon.svg"')
s = s.replace('href="Cservid_Zsombor_CV', 'href="../personal/Cservid_Zsombor_CV')
assert not re.search(r"colorogue|itch\.io", s, re.I), "ColoRogue left"
dst.mkdir(exist_ok=True)
(dst / "index.html").write_text(s)
print("wrote", dst / "index.html")
