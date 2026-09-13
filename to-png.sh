#!/bin/sh
# The README shows PNGs; the SVGs are the real output. Re-run after
# make-examples.js or make-sweeps.js. Needs rsvg-convert (brew install librsvg).
#
# Everything converts 1:1, at the pixel size the SVG declares, and that matters
# more than it looks. A render style measures its marks in OUTPUT PIXELS -- a
# stipple dot of radius 1.3 means 1.3 pixels of the finished image, not of the
# world. make-examples.js renders for a 1000px image, so resizing on the way to
# PNG resizes the marks with it. The old 520px output put every one of them at
# 52%, which drove the fine end under a pixel -- Grain's smallest dot from 0.2px
# to 0.1px, Scribble's thinnest stroke from 0.6px to 0.31px -- where resampling
# turns marks into a grey wash. Do not add -w/-h here.
set -e
# rsvg-convert reads .svgz as happily as .svg, so the examples being deflated
# changes nothing here beyond the glob.
for f in examples/*.svgz; do
  [ -e "$f" ] || continue
  rsvg-convert "$f" -o "${f%.svgz}.png"
done
for f in sweeps/*.svg; do
  [ -e "$f" ] || continue
  rsvg-convert "$f" -o "${f%.svg}.png"
done
