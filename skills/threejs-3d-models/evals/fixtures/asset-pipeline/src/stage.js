import { AnimationMixer, Box3, PerspectiveCamera, PMREMGenerator, Scene, Sphere, Timer, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loader } from './loader.js';

// Minimal viewer shared by the three sections of the page.
export async function createStage(container, url, { animate = false } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.append(renderer.domElement);

  const scene = new Scene();
  scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.01, 1000);

  const gltf = await loader.loadAsync(url);
  scene.add(gltf.scene);
  const sphere = new Box3().setFromObject(gltf.scene).getBoundingSphere(new Sphere());
  camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + sphere.radius * 3);
  camera.lookAt(sphere.center);

  const mixer = animate && gltf.animations.length ? new AnimationMixer(gltf.scene) : null;
  mixer?.clipAction(gltf.animations[0]).play();
  const timer = new Timer();
  renderer.setAnimationLoop((time) => {
    timer.update(time);
    mixer?.update(timer.getDelta());
    renderer.render(scene, camera);
  });
  return { scene, gltf };
}
