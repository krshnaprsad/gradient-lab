# Contributing

No dependencies to install. You need Node 18 or newer.

```
npm test
```

That runs `mesh.test.js`: colour helpers, preset and size integrity, the point caps, the aspect remap, random gradient validity, and properties of the blend (finite, in range, smooth, moves toward the nearest blob).

Layout:

- `mesh.js` has no browser code, so it can be tested in Node.
- `app.js` is the page: WebGL rendering, pointer handling and PNG export. The fragment shader implements the same blend as `MESH.shade` plus the swirl noise and grain, so if you change the blend, change both places and keep the tests honest.

Points live in "height units": y runs 0 to 1 down the canvas, x runs 0 to the aspect ratio. That is what makes export at any size and aspect a remap instead of a redesign.

Ideas that fit: more presets, an undo button, SVG or CSS export of the finished gradient. Ideas that do not fit: accounts, uploads, watermarks, paid sizes.
