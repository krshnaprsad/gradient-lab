# Gradient Lab

Soft mesh gradients, blended by hand, exported as wallpapers.

Made by Zero3.

## What it does

I wanted a place to play with those soft Apple-style wallpaper colours. This is my take: drag colour blobs, bend the blend and download the result without an account or a watermark.

You get a canvas with colour blobs. Drag them around, click one to change its colour, add more (up to 24), and the colours melt together live. Sliders shape the look: Softness (how far each colour reaches), Swirl (bends the blend into flowing folds), Silk fold (a curved fold with a soft crease), Fold style (Wave, Curl, Sweep or Flow), Fold X and Fold Y (move the fold centre), and Noise amount (adds texture, from subtle to heavy). Pick fine, film, coarse monochrome grain or colour noise. There is an Animate switch that lets the blobs drift slowly, twelve presets to start from, and a Surprise me button when you want luck to pick.

When it looks right, download a PNG at a real size: phone wallpaper (1290 x 2796), desktop 4K (3840 x 2160), square post (2048 x 2048), A4 poster for print (2480 x 3508), 16:9, 9:16, 4:3 and 3:2 options, or any custom size up to 8000 px. The canvas itself changes shape with the size you choose. The PNG has no handles or UI.

## More mesh in v1.1 and v1.2

There are now up to 24 colour points, a live point counter, and three denser presets: Aurora Silk (10 points), Rose Ribbon (12), and Lagoon Glass (10). Each sets its own softness and swirl. The original five presets are still there, plus Silk Fold for a soft Apple-wallpaper-inspired fold with a subtle crease, and Silk Curl, which winds the colours into a rounded curl with a soft, defined edge at the centre. Move that curl anywhere with Fold X and Fold Y. If Silk fold is at 0 the fold controls have nothing to bend, so the app raises it a little for you when you use them. These are original gradients, not copies of Apple artwork.

Noise uses the same normalized texture coordinates in the preview and export, so the texture keeps its scale when the PNG is larger. Set Noise amount to 0 for no grain.

## Sweep in v1.3

Pastel Sweep uses two open smooth surfaces instead of a radial twirl. A diagonal colour band meets a pointed warm lobe, without a ring or shaded crease. The first four blob colours set the field, band, lobe and corner glow; extra blobs add local colour accents. Fold X/Y moves the tip, Silk fold bends the lobe, Swirl tilts the diagonal and Softness changes the edge softness. Pastel Sweep starts still with no grain. Wave and Curl remain available.

## Flow in v1.4.1

Chromatic Flow adds broad interlocking blue-violet, magenta and cyan shapes with fine grain and an off-white edge fade. It starts at a 2:1 wide landscape size. The blue and violet points bend the upper and lower halves of one S-shaped body. Magenta and cyan points move the surrounding surfaces. Curved boundaries replace the 1.4.0 stacked-ellipse construction. Fold X/Y moves the composition, Silk fold deepens the cyan cut-in, Swirl tilts the shapes and Softness changes their edges. The new Edge fade slider works on any style and fades into your chosen background. Wave, Curl and Sweep stay available.

## Use it

Open the app: https://krshnaprsad.github.io/gradient-lab/

Or download the repo and open `index.html`. Nothing to install and nothing leaves your computer. The gradients you make are yours.

## Things to know

- **It needs WebGL.** Support depends on the browser and device. If yours has it blocked (some locked-down work laptops do), the tool says so instead of showing a broken page.
- **The blend is done in linear light**, so colours melt the way light does instead of going muddy in the middle. The grain slider exists because perfectly smooth gradients can show faint banding on some screens; a little grain hides it.
- **Swirl uses flowing noise**, the same trick behind those folded silk wallpapers. At 0 the blend is pure blobs, at 1 it folds hard.
- **Export matches the screen.** When Animate is on, the download uses the frame captured when you press Download.
- **The colour chips under the canvas are clickable.** One click copies the hex code, handy when you want the same palette in Figma or a design.
- Blob positions adapt when you switch export size, so a wallpaper composed on the phone preview still looks right at 4K.

## How I checked it

The tests (`npm test`, Node 18 or newer, nothing to install) cover the colour maths, the presets, the point limits, the aspect remap, 200 random Surprise me gradients, and the blend itself: it must stay finite and in range everywhere, move toward a blob's colour as you approach it, and change smoothly between neighbouring samples.

I checked the live page in desktop Chrome: dragged a blob, added and removed blobs, opened all twelve presets, changed each slider, and downloaded phone, 4K, square, A4 and custom PNGs. The downloaded files opened at their stated pixel sizes. I also checked the 390 px mobile layout. I have not tested on a real phone or in Safari or Firefox. Device memory and graphics limits can affect very large custom exports.

## Files

- `index.html`, `app.css`, `app.js` the app
- `mesh.js` the pure logic (colours, presets, point rules, the blend in plain JS) with no browser code, so it can be tested in Node
- `mesh.test.js` the tests

Developer notes are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT for the code. The swirl uses the MIT-licensed webgl-noise routine; see [NOTICE.md](NOTICE.md). The Zero3 name and logo are not part of the licence. See [LICENSE](LICENSE).
