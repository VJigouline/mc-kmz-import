# KMZ test files

Real KMZ files that the tests load. They are unchanged copies, taken at commit `1d3772857e` of three.js.

| Files | What they cover | Source and licence |
| --- | --- | --- |
| `Box.kmz` | A placed Collada box | The [three.js](https://github.com/mrdoob/three.js) repository (`examples/models/kmz`), under its [MIT licence](https://github.com/mrdoob/three.js/blob/dev/LICENSE); no other licence is stated for them. Its readme says the Collada box is from the [glTF sample models](https://github.com/KhronosGroup/glTF-Sample-Models). |
| `Readme.txt` | The readme that comes with it | The [three.js](https://github.com/mrdoob/three.js) repository (`examples/models/kmz`), under its [MIT licence](https://github.com/mrdoob/three.js/blob/dev/LICENSE); no other licence is stated for them. |

The tests also build archives with several placemarks.

These files keep their own licences. They are test data only, and are not part of the npm package, which includes only `dist`, `Documentation`, `README.md` and `LICENSE`.
