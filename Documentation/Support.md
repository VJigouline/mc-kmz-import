# Formats and support

mc-kmz-import reads KMZ with its own KML reader and three.js's ColladaLoader.

## What is read

- Placemarks with models: their location (longitude, latitude, altitude), orientation (heading, tilt, roll) and scale.
- The Collada models, with their textures from the archive.
- Several placemarks, placed relative to the first, in metres.
- Archives without a KML document, showing their Collada models.

## Orientation and units

Models are placed east along x, up along y and north along -z, from the first placemark, which is at the origin; `origin` gives its longitude, latitude and altitude.

## Limits

Points, paths, polygons, overlays and styles of the KML are not drawn. ColladaLoader reads XML with DOMParser, so in Node a DOM implementation must be provided; the tests use jsdom.
