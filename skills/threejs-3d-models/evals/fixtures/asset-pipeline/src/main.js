import { createStage } from './stage.js';
import { setupConfigurator } from './configurator.js';

createStage(document.getElementById('hero-model'), '/models/helmet.glb');
setupConfigurator(document.getElementById('chair-model'));
createStage(document.getElementById('mascot-model'), '/models/fox.glb', { animate: true });
