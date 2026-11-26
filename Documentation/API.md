# API

## `loadKmz(input, options?)`

Reads `.kmz` archives, or a `.kml` file with its models and returns a promise of a `KmzLoadResult`.

`input` is the file's contents (`ArrayBuffer`, `Uint8Array` or string), a browser `File`, `{ name, data }`, or an iterable of files. Zip archives among them are opened.

It throws a `KmzImportError` for input that isn't KMZ.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `materialType` | 'standard' | `'standard'` or `'original'`. |

### `KmzLoadResult`

| Field | Type | Meaning |
| --- | --- | --- |
| `group` | `THREE.Group` | The model. |
| `name` | `string` | The document's name. |
| `placemarks` | `KmzPlacemark[]` | The placemarks with models. |
| `origin` | object | Longitude, latitude and altitude of the origin. |
| `missing` | `string[]` | Models and textures the archive lacks. |
| `warnings` | `string[]` | Problems that didn't stop the import. |
| `stats` | object | Counts of meshes, triangles, lines and points. |

See the package's `index.d.ts` for every exported type and helper.
