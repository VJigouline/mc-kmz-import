// Reads Google Earth KMZ archives, as exported by SketchUp and other modellers: the KML document
// and the Collada models its placemarks place, with their textures. Models are placed relative
// to the first one, in metres, east along x, up along y and north along -z.

import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { countModel, FileManager, ImportFiles, toStandardMaterials, type ImportInput, type ImportStats } from './common.js';
import { parseXml, type XmlElement } from './xml.js';

export { ImportFiles, FileManager, countModel } from './common.js';
export type { ImportInput, ImportFile, ImportData, ImportStats } from './common.js';

export interface KmzOptions {
  /** 'standard' (the default) makes MeshStandardMaterial; 'original' keeps Collada's Phong and Lambert materials. */
  materialType?: 'standard' | 'original';
}

export interface KmzPlacemark {
  name: string;
  /** The Collada model, as the KML names it. */
  model: string;
  longitude: number;
  latitude: number;
  /** Metres. */
  altitude: number;
  altitudeMode: string;
  /** Degrees. */
  heading: number;
  tilt: number;
  roll: number;
  scale: [number, number, number];
}

export interface KmzLoadResult {
  /** The models, placed, in a group named after the file. */
  group: THREE.Group;
  /** The document's name, if it has one. */
  name: string;
  placemarks: KmzPlacemark[];
  /** Longitude, latitude and altitude of the group's origin, from the first placemark. */
  origin: { longitude: number; latitude: number; altitude: number } | null;
  /** Textures and models that the archive lacks. */
  missing: string[];
  warnings: string[];
  stats: ImportStats;
}

export class KmzImportError extends Error {
  override name = 'KmzImportError';
}

const EARTH_RADIUS = 6378137;

const find = (e: XmlElement, name: string): XmlElement | undefined => {
  for (const c of e.children) {
    if (c.name === name || c.name.endsWith(':' + name)) return c;
    const deep = find(c, name);
    if (deep) return deep;
  }
  return undefined;
};
const all = (e: XmlElement, name: string, out: XmlElement[] = []): XmlElement[] => {
  for (const c of e.children) {
    if (c.name === name || c.name.endsWith(':' + name)) out.push(c);
    else all(c, name, out);
  }
  return out;
};
const text = (e: XmlElement | undefined, name: string) => (e ? find(e, name)?.text.trim() ?? '' : '');
const num = (e: XmlElement | undefined, name: string, fallback: number) => {
  const v = Number(text(e, name));
  return text(e, name) && Number.isFinite(v) ? v : fallback;
};

/** Reads the placemarks of a KML document that hold models. */
export function readKml(kml: string): { name: string; placemarks: KmzPlacemark[] } {
  const root = parseXml(kml);
  if (!/(^|:)kml$/.test(root.name)) throw new KmzImportError(`The document's root is <${root.name}>, not <kml>`);
  const placemarks: KmzPlacemark[] = [];
  for (const p of all(root, 'Placemark')) {
    const model = find(p, 'Model');
    if (!model) continue;
    const location = find(model, 'Location');
    const point = text(p, 'coordinates').split(/[\s,]+/).map(Number);
    const orientation = find(model, 'Orientation');
    const scale = find(model, 'Scale');
    placemarks.push({
      name: text(p, 'name') || text(model, 'href'),
      model: text(model, 'href'),
      longitude: num(location, 'longitude', point[0] ?? 0),
      latitude: num(location, 'latitude', point[1] ?? 0),
      altitude: num(location, 'altitude', point[2] ?? 0),
      altitudeMode: text(model, 'altitudeMode') || text(p, 'altitudeMode') || 'clampToGround',
      heading: num(orientation, 'heading', 0),
      tilt: num(orientation, 'tilt', 0),
      roll: num(orientation, 'roll', 0),
      scale: [num(scale, 'x', 1), num(scale, 'y', 1), num(scale, 'z', 1)],
    });
  }
  const document = find(root, 'Document');
  return { name: document ? text({ ...document, children: document.children.filter((c) => c.name === 'name') }, 'name') : '', placemarks };
}

/** Reads a KMZ archive (or a KML file with its models). ColladaLoader reads XML with DOMParser, so Node needs a DOM. */
export async function loadKmz(input: ImportInput, options: KmzOptions = {}): Promise<KmzLoadResult> {
  const files = await ImportFiles.from(input, 'model.kmz');
  if (!files.files.length) throw new KmzImportError('There is nothing to open');
  const kmlFile = files.files.find((f) => /(^|\/)doc\.kml$/i.test(f.name)) ?? files.files.find((f) => /\.kml$/i.test(f.name));
  const warnings: string[] = [];
  let doc: { name: string; placemarks: KmzPlacemark[] } = { name: '', placemarks: [] };
  if (kmlFile) {
    try {
      doc = readKml(files.text(kmlFile));
    } catch (error) {
      throw new KmzImportError(`${kmlFile.name} could not be read: ${(error as Error).message}`);
    }
  }
  // Without placemarks, the archive's Collada models are shown where they are.
  if (!doc.placemarks.length) {
    const daes = files.files.filter((f) => /\.dae$/i.test(f.name));
    if (!daes.length) throw new KmzImportError(kmlFile ? 'The KMZ has no models: its KML places none, and it holds no .dae file' : 'Not a KMZ archive: it holds neither a KML document nor a Collada model');
    if (kmlFile) warnings.push('The KML places no models; the archive\'s Collada models are shown unplaced');
    doc.placemarks = daes.map((f) => ({ name: f.name, model: f.name, longitude: 0, latitude: 0, altitude: 0, altitudeMode: 'relativeToGround', heading: 0, tilt: 0, roll: 0, scale: [1, 1, 1] }));
  }

  const fm = new FileManager(files);
  const loader = new ColladaLoader(fm.manager);
  const first = doc.placemarks[0]!;
  const lat0 = (first.latitude * Math.PI) / 180;
  const group = new THREE.Group();
  const missing = new Set<string>();
  const warn = console.warn;
  for (const p of doc.placemarks) {
    const dae = files.find(p.model);
    if (!dae) {
      missing.add(p.model);
      continue;
    }
    let scene: THREE.Object3D;
    try {
      console.warn = (...args: unknown[]) => {
        if (!/Z-UP coordinate system/.test(String(args[0]))) warnings.push(`${p.model}: ${String(args[0]).replace(/^THREE\.ColladaLoader:\s*/, '')}`);
      };
      const folder = dae.name.includes('/') ? dae.name.slice(0, dae.name.lastIndexOf('/') + 1) : '';
      const result = loader.parse(files.text(dae), folder);
      if (!result) throw new Error('it is not Collada');
      scene = result.scene;
    } catch (error) {
      warnings.push(`${p.model} could not be read: ${(error as Error).message}`);
      continue;
    } finally {
      console.warn = warn;
    }
    // Local east-north-up offsets from the first placemark, in metres; north is -z.
    const east = (((p.longitude - first.longitude) * Math.PI) / 180) * EARTH_RADIUS * Math.cos(lat0);
    const north = (((p.latitude - first.latitude) * Math.PI) / 180) * EARTH_RADIUS;
    const place = new THREE.Group();
    place.name = p.name;
    place.position.set(east, p.altitude - first.altitude, -north);
    place.rotation.set((p.tilt * Math.PI) / 180, (-p.heading * Math.PI) / 180, (p.roll * Math.PI) / 180, 'YXZ');
    place.scale.set(p.scale[0], p.scale[2], p.scale[1]);
    place.userData.kml = p;
    place.add(scene);
    group.add(place);
  }
  await fm.done();
  fm.dispose();
  for (const m of fm.missing) missing.add(m);
  if (!group.children.length) throw new KmzImportError(`None of the models could be read${missing.size ? `; missing: ${[...missing].join(', ')}` : ''}`);
  if (options.materialType !== 'original') toStandardMaterials(group);
  const name = (Array.isArray(input) || input instanceof Uint8Array || input instanceof ArrayBuffer || typeof input === 'string' ? '' : (input as { name?: string }).name ?? '').replace(/\\/g, '/').split('/').pop()!.replace(/\.km[lz]$/i, '');
  group.name = name || doc.name || 'KMZ';
  return {
    group,
    name: doc.name,
    placemarks: doc.placemarks,
    origin: kmlFile ? { longitude: first.longitude, latitude: first.latitude, altitude: first.altitude } : null,
    missing: [...missing],
    warnings,
    stats: countModel(group),
  };
}
