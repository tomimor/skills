// Imperative core behind <three-model>: renderer, lighting, loading, framing,
// render-on-demand, pause-offscreen, and full disposal. Framework wrappers can
// call mountModel() directly from their mount/unmount hooks. This module pulls
// in three.js, so always load it with a dynamic import().
import {
  AnimationMixer,
  Box3,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Sphere,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VIEW_DIRECTION = new Vector3(0, 0.3, 1).normalize();
const KEY_STEP = Math.PI / 24;
const KEY_MOVES = {
  ArrowLeft: [KEY_STEP, 0],
  ArrowRight: [-KEY_STEP, 0],
  ArrowUp: [0, KEY_STEP],
  ArrowDown: [0, -KEY_STEP],
};

const _vertex = new Vector3();
const _box = new Box3();

let sharedLoader = null;

// One loader per page: decoders download on first use, and their workers are
// shared. Since r185 the Draco/Basis decoder URLs resolve through
// new URL(..., import.meta.url), which bundlers like Vite emit as assets. Older
// three or other bundlers: self-host them (threejs-3d-models skill,
// references/asset-pipeline.md).
function getLoader(renderer) {
  sharedLoader ??= new GLTFLoader()
    .setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG))
    .setKTX2Loader(new KTX2Loader().detectSupport(renderer))
    .setMeshoptDecoder(MeshoptDecoder);
  return sharedLoader;
}

// Smallest sphere (around the box center) that holds every vertex, skinning
// included. Orbiting never clips the model, and it fills far more of the frame
// than the sphere around its bounding box.
function fitSphere(root, sphere) {
  root.updateMatrixWorld(true); // bones must be current for skinned vertices
  _box.setFromObject(root, true).getCenter(sphere.center);
  let radiusSq = 0;
  const include = (point) => (radiusSq = Math.max(radiusSq, point.distanceToSquared(sphere.center)));
  root.traverse((object) => {
    if (!object.isMesh) return;
    if (object.isInstancedMesh) {
      object.computeBoundingBox();
      const { min, max } = object.boundingBox;
      for (let i = 0; i < 8; i++) {
        _vertex.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z);
        include(_vertex.applyMatrix4(object.matrixWorld));
      }
      return;
    }
    const { count } = object.geometry.attributes.position;
    for (let i = 0; i < count; i++) include(object.getVertexPosition(i, _vertex).applyMatrix4(object.matrixWorld));
  });
  sphere.radius = Math.sqrt(radiusSq);
}

function disposeObject(root) {
  root.traverse((object) => {
    object.geometry?.dispose();
    object.skeleton?.dispose();
    for (const material of [object.material ?? []].flat()) {
      for (const value of Object.values(material)) {
        if (!value?.isTexture) continue;
        value.image?.close?.(); // GLTFLoader decodes to ImageBitmaps, which are not GC'd
        value.dispose();
      }
      material.dispose();
    }
  });
}

/**
 * @param {HTMLElement} container Sized box (CSS aspect-ratio or height); the canvas fills it.
 * @param {object} options
 * @param {string} options.src .glb URL
 * @param {HTMLElement} [options.poster] Shown until the first frame, and again on context loss.
 * @param {boolean} [options.controls] Drag to orbit, arrow keys when focused.
 * @param {boolean} [options.zoom] Wheel/pinch zoom. Off by default: it captures page scroll.
 * @param {boolean} [options.autoRotate] Ignored under prefers-reduced-motion.
 * @param {boolean} [options.autoplay] Play the first animation clip. Ignored under reduced motion.
 * @param {number} [options.exposure]
 * @param {number} [options.maxPixelRatio]
 * @param {(event: ProgressEvent) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal] Aborting mid-load disposes everything and rejects.
 */
export async function mountModel(container, options) {
  const {
    src,
    poster = null,
    controls = false,
    zoom = false,
    autoRotate = false,
    autoplay = false,
    exposure = 1,
    maxPixelRatio = 2,
    onProgress,
    signal,
  } = options;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Throws when WebGL 2 is unavailable; callers keep the poster as fallback.
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = exposure;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;visibility:hidden';
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const timer = new Timer();
  const bounds = new Sphere();
  let model = null;
  let mixer = null;
  let orbit = null;
  let resizeObserver = null;
  let visibilityObserver = null;
  let active = false;
  let needsRender = true;
  let shown = false;
  let disposed = false;

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;

  function render() {
    renderer.render(scene, camera);
    needsRender = false;
    if (shown) return;
    shown = true;
    canvas.style.visibility = 'visible';
    if (poster) poster.style.visibility = 'hidden';
  }

  function tick(time) {
    timer.update(time);
    const delta = Math.min(timer.getDelta(), 0.1);
    let changed = orbit ? orbit.update(delta) : false;
    if (mixer) {
      mixer.update(delta);
      changed = true;
    }
    if (changed || needsRender) render();
  }

  function setActive(value) {
    if (value === active) return;
    active = value;
    if (active) timer.reset();
    renderer.setAnimationLoop(active ? tick : null);
  }

  function fit() {
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distance = (bounds.radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.05;
    // Keep the user's orbit angle on resize; only the first fit uses VIEW_DIRECTION.
    if (camera.position.lengthSq() === 0) camera.position.copy(VIEW_DIRECTION);
    camera.position.setLength(distance);
    camera.lookAt(0, 0, 0); // OrbitControls does this too, but not every viewer has controls
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    if (orbit) {
      orbit.minDistance = distance * 0.5;
      orbit.maxDistance = distance * 2;
    }
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    fit();
    // Resizing clears the canvas; repaint now instead of flashing an empty frame.
    if (active) render();
    else needsRender = true;
  }

  function onKeyDown(event) {
    const move = KEY_MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    orbit.rotateLeft(move[0]);
    orbit.rotateUp(move[1]);
  }

  function onContextLost() {
    shown = false;
    canvas.style.visibility = 'hidden';
    if (poster) poster.style.visibility = '';
  }

  function onContextRestored() {
    needsRender = true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    setActive(false);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    container.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    orbit?.dispose();
    timer.dispose();
    mixer?.stopAllAction();
    if (model) disposeObject(model);
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss(); // free the context now; browsers cap live contexts per page
    canvas.remove();
    if (poster) poster.style.visibility = '';
  }

  try {
    const gltf = await getLoader(renderer).loadAsync(src, onProgress);
    signal?.throwIfAborted();
    model = gltf.scene;
    scene.add(model);

    if (autoplay && gltf.animations.length && !reducedMotion) {
      mixer = new AnimationMixer(model);
      mixer.clipAction(gltf.animations[0]).play();
      mixer.update(0); // measure the animated pose, not the bind pose
    }
    fitSphere(model, bounds);
    model.position.sub(bounds.center);
    bounds.center.set(0, 0, 0);

    if (controls || autoRotate) {
      orbit = new OrbitControls(camera, canvas);
      orbit.enabled = controls;
      orbit.enableDamping = true;
      orbit.enablePan = false;
      orbit.enableZoom = zoom;
      orbit.autoRotate = autoRotate && !reducedMotion;
      // OrbitControls sets touch-action:none, which blocks page scroll on touch.
      // Without pinch zoom, let vertical swipes scroll; horizontal drags still orbit.
      canvas.style.touchAction = !controls ? '' : zoom ? 'none' : 'pan-y';
    }
    if (controls) {
      container.addEventListener('keydown', onKeyDown);
      if (!container.hasAttribute('tabindex')) container.tabIndex = 0;
    }

    // Compile shaders without blocking the main thread, before the first frame.
    // Without the extension compileAsync() saves nothing and logs a warning.
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(scene, camera);
      signal?.throwIfAborted();
    }

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    container.append(canvas);
    timer.connect(document);
    resize();
    render(); // first frame now, so the promise resolves with the model on screen
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    visibilityObserver = new IntersectionObserver((entries) => setActive(entries.at(-1).isIntersecting));
    visibilityObserver.observe(container);

    return { renderer, scene, camera, model, gltf, controls: orbit, mixer, dispose, requestRender: () => (needsRender = true) };
  } catch (error) {
    dispose();
    throw error;
  }
}
