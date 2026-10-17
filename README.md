# Gradient Lab

Soft mesh gradients, blended by hand, exported as wallpapers.

Made by Zero3.

## What it does

I kept seeing those soft Apple-style wallpapers, big blurry blobs of colour melting into each other, and every tool I found either added a watermark, wanted an account, or locked the good sizes behind a paid plan. So I built one that is free and stays on your own computer.

You get a canvas with colour blobs. Drag them around, click one to change its colour, add more (up to 12), and the colours melt together live. Three sliders shape the look: Softness (how far each colour reaches), Swirl (bends the blend into flowing folds) and Grain (adds film grain so big soft areas do not show banding). There is an Animate switch that lets the blobs drift slowly, five presets to start from, and a Surprise me button when you want luck to pick.

When it looks right, download a PNG at a real size: phone wallpaper (1290 x 2796), desktop 4K (3840 x 2160), square post (2048 x 2048), A4 poster for print (2480 x 3508), or any custom size up to 8000 px. What you see on the canvas is what downloads.

## Use it

Open the app: https://krshnaprsad.github.io/gradient-lab/

Or download the repo and open `index.html`. Nothing to install and nothing leaves your computer. The gradients you make are yours.

## Things to know

- **It needs WebGL.** Every current browser has it. If yours has it blocked (some locked-down work laptops do), the tool says so instead of showing a broken page.
- **The blend is done in linear light**, so colours melt the way light does instead of going muddy in the middle. The grain slider exists because perfectly smooth gradients can show faint banding on some screens; a little grain hides it.
- **Swirl uses flowing noise**, the same trick behind those folded silk wallpapers. At 0 the blend is pure blobs, at 1 it folds hard.
- **Export matches the screen.** When Animate is on, the download uses the exact frame you are looking at.
- **The colour chips under the canvas are clickable.** One click copies the hex code, handy when you want the same palette in Figma or a design.
- Blob positions adapt when you switch export size, so a wallpaper composed on the phone preview still looks right at 4K.

## How I checked it

The tests (`npm test`, Node 18 or newer, nothing to install) cover the colour maths, the presets, the point limits, the aspect remap, 200 random Surprise me gradients, and the blend itself: it must stay finite and in range everywhere, move toward a blob's colour as you approach it, and never jump between neighbouring pixels (that is where banding starts).

Separately I opened the live page in Chrome, dragged blobs, added and removed them, tried every preset and slider, and downloaded the phone, 4K, square and poster sizes. Every download opened as a valid PNG at the exact pixel size promised.

## Files

- `index.html`, `app.css`, `app.js` the app
- `mesh.js` the pure logic (colours, presets, point rules, the blend in plain JS) with no browser code, so it can be tested in Node
- `mesh.test.js` the tests

Developer notes are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT for the code. The Zero3 name and logo are not part of the licence. See [LICENSE](LICENSE).
