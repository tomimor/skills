// Builds the asset-pipeline fixture's chair.glb: a stand-in for an unoptimized
// Blender export. Named parts share two materials (join would merge them), five
// identical slats (instancing would collapse them), and a 4096² wood texture.
// Usage: node make-chair.mjs <out.glb>   (needs @gltf-transform/core and sharp)
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';

const [out] = process.argv.slice(2);
const doc = new Document();
const buffer = doc.createBuffer();

function box(name, [sx, sy, sz]) {
  const faces = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  const pos = [], nor = [], uv = [], idx = [];
  const half = [sx / 2, sy / 2, sz / 2];
  for (const [n, u, v] of faces) {
    const base = pos.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (let k = 0; k < 3; k++) pos.push((n[k] + a * u[k] + b * v[k]) * half[k]);
      nor.push(...n);
      uv.push((a + 1) / 2, (1 - b) / 2);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  return doc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', new Float32Array(pos)))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(nor)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv)))
    .setIndices(acc('SCALAR', new Uint16Array(idx)));
}

// 4096² wood-like texture: warm stripes with grain, saved as a high-quality JPEG.
const size = 4096;
const pixels = Buffer.alloc(size * size * 3);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const grain = Math.sin(x / 9 + Math.sin(y / 140) * 6) * 0.5 + 0.5;
    const noise = ((x * 7919 + y * 104729) % 97) / 97;
    const t = 0.55 + grain * 0.35 + noise * 0.1;
    const i = (y * size + x) * 3;
    pixels[i] = 150 * t + 40;
    pixels[i + 1] = 105 * t + 25;
    pixels[i + 2] = 60 * t + 15;
  }
}
const woodJpeg = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
const wood = doc.createMaterial('Oak')
  .setBaseColorTexture(doc.createTexture('oak_basecolor').setImage(woodJpeg).setMimeType('image/jpeg'))
  .setMetallicFactor(0)
  .setRoughnessFactor(0.6);
const fabric = doc.createMaterial('Fabric').setBaseColorFactor([0.85, 0.8, 0.7, 1]).setMetallicFactor(0).setRoughnessFactor(0.9);

const scene = doc.createScene('Scene');
const chair = doc.createNode('Chair');
scene.addChild(chair);
const part = (name, dims, material, translation) => {
  const mesh = doc.createMesh(name).addPrimitive(box(name, dims).setMaterial(material));
  chair.addChild(doc.createNode(name).setMesh(mesh).setTranslation(translation));
};
part('Seat', [0.56, 0.1, 0.52], fabric, [0, 0.45, 0]);
part('Backrest', [0.56, 0.42, 0.08], fabric, [0, 0.78, -0.24]);
for (const [name, x, z] of [['Leg_FL', -0.24, 0.22], ['Leg_FR', 0.24, 0.22], ['Leg_BL', -0.24, -0.22], ['Leg_BR', 0.24, -0.22]]) {
  part(name, [0.05, 0.4, 0.05], wood, [x, 0.2, z]);
}
for (const [name, x] of [['Armrest_L', -0.31], ['Armrest_R', 0.31]]) part(name, [0.06, 0.06, 0.5], wood, [x, 0.65, 0]);
for (let i = 1; i <= 5; i++) part(`Slat_${i}`, [0.03, 0.34, 0.03], wood, [-0.2 + (i - 1) * 0.1, 0.78, -0.29]);

await new NodeIO().write(out, doc);
console.log(`wrote ${out}`);
