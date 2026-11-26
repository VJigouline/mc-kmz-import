# Getting started

## Install

```sh
npm install three github:VJigouline/mc-kmz-import
```

## Open a file

`loadKmz` takes the file's contents (`ArrayBuffer`, `Uint8Array` or string), a browser `File`, `{ name, data }`, or an iterable of files. Zip archives among them are opened. It returns a promise of the model.

```ts
import * as THREE from 'three';
import { loadKmz } from 'mc-kmz-import';

const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
input.addEventListener('change', async () => {
  const result = await loadKmz(input.files![0]!);
  scene.add(result.group);
  for (const warning of result.warnings) console.warn(warning);
});
```

## What you get

- **`group`:** a `THREE.Group` holding the model, named after the file.
- **`stats`:** counts of what was read.
- **`warnings`:** anything that couldn't be read or was left out.

Models are placed east along x, up along y and north along -z, from the first placemark, which is at the origin; `origin` gives its longitude, latitude and altitude.

## Options

- **`materialType`** (default 'standard'): `'standard'` or `'original'`.

See the [API](API.md) for every field of the result.
