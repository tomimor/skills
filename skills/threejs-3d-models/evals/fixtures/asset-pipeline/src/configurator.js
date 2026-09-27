import { Color } from 'three';
import { createStage } from './stage.js';

// Part names come from the artist's Blender file; the configurator relies on them.
const PARTS = {
  upholstery: ['Seat', 'Backrest'],
  frame: ['Leg_FL', 'Leg_FR', 'Leg_BL', 'Leg_BR', 'Armrest_L', 'Armrest_R', 'Slat_1', 'Slat_2', 'Slat_3', 'Slat_4', 'Slat_5'],
};

const FINISHES = {
  upholstery: { oat: '#d8cbb3', moss: '#5b6b4a', rust: '#9a4a2f' },
  frame: { natural: '#ffffff', black: '#2a2622' },
};

export async function setupConfigurator(container) {
  const { gltf } = await createStage(container, '/models/chair.glb');
  const parts = {};
  for (const [group, names] of Object.entries(PARTS)) {
    parts[group] = names.map((name) => {
      const mesh = gltf.scene.getObjectByName(name);
      if (!mesh) console.error(`Configurator: part "${name}" not found in chair.glb`);
      return mesh;
    }).filter(Boolean);
  }

  for (const button of document.querySelectorAll('[data-group]')) {
    button.addEventListener('click', () => {
      const color = new Color(FINISHES[button.dataset.group][button.dataset.finish]);
      for (const mesh of parts[button.dataset.group]) {
        mesh.material = mesh.material.clone();
        mesh.material.color.copy(color);
      }
    });
  }
  window.configuratorParts = parts;
}
