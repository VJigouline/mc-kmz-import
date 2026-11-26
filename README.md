# mc-kmz-import

A KMZ importer for [three.js](https://threejs.org/), written in TypeScript. It reads Google Earth KMZ archives, as SketchUp and other modellers export them: the KML document and the Collada models its placemarks place, with their textures, in metres and Y up. It was made for [SceneEditor](https://github.com/VJigouline/SceneEditor), and works in any three.js application.

```ts
import { loadKmz } from 'mc-kmz-import';

const result = await loadKmz(file);
scene.add(result.group);
console.log(result.warnings);       // anything that couldn't be read
```

## What it reads

- Placemarks with models: their location (longitude, latitude, altitude), orientation (heading, tilt, roll) and scale.
- The Collada models, with their textures from the archive.
- Several placemarks, placed relative to the first, in metres.
- Archives without a KML document, showing their Collada models.

Points, paths, polygons, overlays and styles of the KML are not drawn. ColladaLoader reads XML with DOMParser, so in Node a DOM implementation must be provided; the tests use jsdom. See [Formats and support](Documentation/Support.md) for the details.

## Install

The package is not on the npm registry. Install it from GitHub:

```sh
npm install github:VJigouline/mc-kmz-import
```

`three` (r160 or later) is a peer dependency. The package builds itself on install.

## Documentation

- [Getting started](Documentation/GettingStarted.md)
- [API](Documentation/API.md)
- [Formats and support](Documentation/Support.md)
- [Using it in SceneEditor](Documentation/SceneEditor.md)

## Development

```sh
npm install
npm test           # unit tests, with Vitest
npm run typecheck
npm run build      # dist/
```

The tests load real KMZ files, kept in [`tests/samples`](tests/samples/README.md) with their licences. It needs Node.js 22 or later.

## Licence

[MIT](LICENSE)
