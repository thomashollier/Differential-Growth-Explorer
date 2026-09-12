#!/bin/sh
# The README shows PNGs; the SVGs are the real output. Re-run after
# make-examples.js or make-sweeps.js. Needs rsvg-convert (brew install librsvg).
set -e
for f in examples/*.svg; do
  w=$(sed -n 's/.*<svg[^>]*width="\([0-9]*\)".*/\1/p' "$f" | head -1)
  h=$(sed -n 's/.*<svg[^>]*height="\([0-9]*\)".*/\1/p' "$f" | head -1)
  if [ "$w" -ge "$h" ]; then rsvg-convert -w 520 "$f" -o "${f%.svg}.png"
  else rsvg-convert -h 520 "$f" -o "${f%.svg}.png"; fi
done

# the sweep strips are wide and already sized in output pixels, so they go out
# at their own width rather than being fitted to a box
for f in sweeps/*.svg; do
  [ -e "$f" ] || continue
  rsvg-convert "$f" -o "${f%.svg}.png"
done
