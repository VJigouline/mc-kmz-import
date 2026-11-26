import { unzipSync, zipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { describe, expect, it } from 'vitest';
import { KmzImportError, loadKmz, readKml } from '../src/index.js';
import { sample } from './files.js';

const box = () => unzipSync(sample('Box.kmz').data)['files/Box.dae']!;

const kml = (placemarks: string) => new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Site</name>${placemarks}</Document></kml>`);

const placemark = (name: string, lon: number, lat: number, alt: number, heading = 0) => `
  <Placemark><name>${name}</name>
    <Model><altitudeMode>absolute</altitudeMode>
      <Location><longitude>${lon}</longitude><latitude>${lat}</latitude><altitude>${alt}</altitude></Location>
      <Orientation><heading>${heading}</heading><tilt>0</tilt><roll>0</roll></Orientation>
      <Scale><x>1</x><y>1</y><z>2</z></Scale>
      <Link><href>models/box.dae</href></Link>
    </Model>
  </Placemark>`;

describe('KMZ', () => {
  it('reads a KMZ with its Collada model', async () => {
    const r = await loadKmz(sample('Box.kmz'));
    expect(r.placemarks).toHaveLength(1);
    expect(r.placemarks[0]).toMatchObject({ name: 'Simple placemark', model: 'files/Box.dae' });
    expect(r.origin!.longitude).toBeCloseTo(-122.0822);
    expect(r.stats.meshes).toBeGreaterThan(0);
    expect(r.missing).toEqual([]);
    expect(r.group.name).toBe('Box');
  });

  it('places several models by longitude, latitude, altitude, heading and scale', async () => {
    const data = zipSync({
      'doc.kml': kml(placemark('A', 0, 0, 10) + placemark('B', 0.001, 0.001, 15, 90)),
      'models/box.dae': box(),
    });
    const r = await loadKmz({ name: 'site.kmz', data });
    expect(r.name).toBe('Site');
    const [a, b] = r.group.children;
    expect(a!.position.toArray()).toEqual([0, 0, -0]);
    // 0.001 degrees is about 111 metres east and north.
    expect(b!.position.x).toBeCloseTo(111.32, 1);
    expect(b!.position.y).toBe(5);
    expect(b!.position.z).toBeCloseTo(-111.32, 1);
    expect(b!.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(b!.scale.y).toBe(2);
  });

  it('reads KML placemarks', () => {
    const doc = readKml(new TextDecoder().decode(kml(placemark('A', 1, 2, 3))));
    expect(doc.placemarks[0]).toMatchObject({ name: 'A', longitude: 1, latitude: 2, altitude: 3, altitudeMode: 'absolute', scale: [1, 1, 2] });
  });

  it('reports missing models, and refuses archives without models', async () => {
    const data = zipSync({ 'doc.kml': kml(placemark('A', 0, 0, 0)) });
    await expect(loadKmz({ name: 'empty.kmz', data })).rejects.toThrow(/missing: models\/box.dae/);
    await expect(loadKmz({ name: 'x.kmz', data: zipSync({ 'a.txt': new Uint8Array([1]) }) })).rejects.toThrow(KmzImportError);
  });
});
