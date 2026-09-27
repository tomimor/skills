// Imperative core behind <three-model>. Every viewer on the page shares one
// WebGLRenderer (a single WebGL context), one loader, one environment map, and
// one parsed copy of each model URL, the architecture Google's <model-viewer>
// uses. When one viewer is visible, the shared canvas sits inside it and
// renders directly. When several are visible, they take turns rendering into
// the shared canvas and copy their frame into their own 2D canvas. Galleries
// of any size stay under the browser's cap on live WebGL contexts, and each
// distinct model is uploaded to the GPU once. Framework wrappers can call
// mountModel() from their mount/unmount hooks. This module pulls in three.js,
// so always load it with a dynamic import().
import {
  AnimationClip,
  AnimationMixer,
  Box3,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Sphere,
  Timer,
  TOUCH,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clone as cloneModel } from 'three/addons/utils/SkeletonUtils.js';

const VIEW_DIRECTION = new Vector3(0, 0.3, 1).normalize();
const KEY_STEP = Math.PI / 24;
const KEY_MOVES = {
  ArrowLeft: [KEY_STEP, 0],
  ArrowRight: [-KEY_STEP, 0],
  ArrowUp: [0, KEY_STEP],
  ArrowDown: [0, -KEY_STEP],
};
// Route changes unmount and remount views; keep the context that long.
const HUB_LINGER_MS = 1000;

const _vertex = new Vector3();
const _box = new Box3();

let hub = null;
let loader = null;
const models = new Map(); // url -> { refs, promise }

// Decoders download on first use, and their workers are shared. Since r185
// the Draco/Basis decoder URLs resolve through new URL(..., import.meta.url),
// which bundlers like Vite emit as assets. Older three or other bundlers:
// self-host them (threejs-3d-models skill, references/asset-pipeline.md).
function getLoader(renderer) {
  loader ??= new GLTFLoader()
    .setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG))
    .setKTX2Loader(new KTX2Loader().detectSupport(renderer))
    .setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

function createHub() {
  // Throws when WebGL 2 is unavailable; callers keep the poster as fallback.
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.toneMapping = NeutralToneMapping;
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  const timer = new Timer();
  timer.connect(document);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  const h = {
    renderer,
    environment,
    timer,
    views: new Set(),
    byElement: new Map(),
    direct: null, // the one visible view the shared canvas is currently placed in
    looping: false,
    lost: false,
    lingering: 0,
  };
  h.visibility = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const view = h.byElement.get(entry.target);
      if (view) view.visible = entry.isIntersecting;
    }
    updateLoop(h);
  });
  h.resizes = new ResizeObserver((entries) => {
    for (const entry of entries) h.byElement.get(entry.target)?.resize();
  });
  renderer.domElement.addEventListener('webglcontextlost', () => {
    h.lost = true;
    leaveDirect(h, false); // fall back to the view's last copied frame
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    h.lost = false;
    for (const view of h.views) view.needsRender = true;
  });
  return h;
}

function disposeHub(h) {
  if (hub !== h || h.views.size) return;
  hub = null;
  h.renderer.setAnimationLoop(null);
  h.visibility.disconnect();
  h.resizes.disconnect();
  h.timer.dispose();
  h.environment.dispose();
  h.renderer.dispose();
  h.renderer.forceContextLoss(); // release the context now instead of at garbage collection
}

// Renders only while a visible view exists; each frame, only views that moved redraw.
function updateLoop(h) {
  const run = [...h.views].some((view) => view.visible && view.ready);
  if (run === h.looping) return;
  h.looping = run;
  if (run) h.timer.reset();
  h.renderer.setAnimationLoop(run ? (time) => tick(h, time) : null);
}

function tick(h, time) {
  h.timer.update(time);
  const delta = Math.min(h.timer.getDelta(), 0.1);
  updateDirect(h);
  for (const view of h.views) if (view.visible && view.ready) view.update(delta);
}

// One visible view: move the shared canvas into it and skip the per-frame copy.
function updateDirect(h) {
  const visible = [...h.views].filter((view) => view.visible && view.ready);
  const target = visible.length === 1 && !h.lost ? visible[0] : null;
  if (h.direct === target) return;
  leaveDirect(h, true);
  if (!target) return;
  h.direct = target;
  target.container.append(h.renderer.domElement);
  target.canvas.style.opacity = '0';
  target.needsRender = true;
}

function leaveDirect(h, repaint) {
  const view = h.direct;
  if (!view) return;
  h.direct = null;
  // Give the view's own canvas a current frame before the shared canvas leaves.
  if (repaint) renderView(h, view);
  view.canvas.style.opacity = '';
  h.renderer.domElement.remove();
}

// Draws a view into the top-left corner of the shared canvas. Unless the
// shared canvas is displayed inside this view, copy that region into the
// view's own 2D canvas.
function renderView(h, view) {
  if (h.lost) return false;
  const { renderer } = h;
  const { width, height } = view.canvas;
  if (!width || !height) return false;
  const shared = renderer.domElement;
  const direct = h.direct === view;
  if (direct ? shared.width !== width || shared.height !== height : shared.width < width || shared.height < height) {
    renderer.setSize(direct ? width : Math.max(shared.width, width), direct ? height : Math.max(shared.height, height), false);
  }
  const y = shared.height - height; // WebGL's origin is bottom-left
  renderer.setViewport(0, y, width, height);
  renderer.setScissor(0, y, width, height);
  renderer.setScissorTest(true);
  renderer.toneMappingExposure = view.exposure;
  renderer.render(view.scene, view.camera);
  if (direct) return true;
  view.context.globalCompositeOperation = 'copy'; // resizing a canvas resets this
  view.context.drawImage(shared, 0, 0, width, height, 0, 0, width, height);
  return true;
}

// Each URL is fetched and parsed once; views get clones that share geometry,
// materials, and textures. Resources are disposed when the last view lets go.
function acquireModel(url, onProgress) {
  let entry = models.get(url);
  if (!entry) {
    entry = { refs: 0, promise: getLoader(hub.renderer).loadAsync(url, onProgress) };
    models.set(url, entry);
    entry.promise.catch(() => models.get(url) === entry && models.delete(url));
  }
  entry.refs++;
  return entry.promise;
}

function releaseModel(url) {
  const entry = models.get(url);
  if (!entry || --entry.refs > 0) return;
  models.delete(url);
  entry.promise.then((gltf) => disposeResources(gltf.scene), () => {});
}

function disposeResources(root) {
  root.traverse((object) => {
    object.geometry?.dispose();
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

/**
 * @param {HTMLElement} container Sized box (CSS aspect-ratio or height); the canvas fills it.
 * @param {object} options
 * @param {string} options.src .glb URL
 * @param {HTMLElement} [options.poster] Shown until the first frame.
 * @param {boolean} [options.controls] Drag to orbit, arrow keys when focused.
 * @param {boolean} [options.zoom] Wheel/pinch zoom. Off by default: it captures page scroll.
 * @param {boolean} [options.autoRotate] Ignored under prefers-reduced-motion.
 * @param {boolean} [options.autoplay] Play an animation clip. Ignored under reduced motion.
 * @param {string} [options.animation] Name of the clip to autoplay; defaults to the first.
 * @param {number} [options.exposure]
 * @param {number} [options.maxPixelRatio]
 * @param {(event: ProgressEvent) => void} [options.onProgress] Fires for the first view of a URL only.
 * @param {AbortSignal} [options.signal] Aborting mid-load disposes the view and rejects.
 */
export async function mountModel(container, options) {
  const {
    src,
    poster = null,
    controls = false,
    zoom = false,
    autoRotate = false,
    autoplay = false,
    animation = null,
    exposure = 1,
    maxPixelRatio = 2,
    onProgress,
    signal,
  } = options;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hub) clearTimeout(hub.lingering);
  hub ??= createHub();
  const h = hub;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;visibility:hidden';
  const context = canvas.getContext('2d');
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const scene = new Scene();
  scene.environment = h.environment.texture;
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const bounds = new Sphere();
  let model = null;
  let mixer = null;
  let orbit = null;
  let acquired = false;
  let shown = false;
  let disposed = false;

  const view = { container, canvas, context, scene, camera, exposure, visible: false, ready: false, needsRender: true, renderCount: 0, update, resize };
  h.views.add(view);

  function draw() {
    if (!renderView(h, view)) return;
    view.needsRender = false;
    view.renderCount++;
    if (shown) return;
    shown = true;
    canvas.style.visibility = 'visible';
    if (poster) poster.style.visibility = 'hidden';
  }

  function update(delta) {
    let changed = orbit ? orbit.update(delta) : false;
    if (mixer) {
      mixer.update(delta);
      changed = true;
    }
    if (changed || view.needsRender) draw();
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
    const ratio = Math.min(window.devicePixelRatio, maxPixelRatio);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    camera.aspect = width / height;
    fit();
    // Resizing clears the canvas; repaint now instead of flashing an empty frame.
    if (view.ready) draw();
  }

  function onKeyDown(event) {
    const move = KEY_MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    orbit.rotateLeft(move[0]);
    orbit.rotateUp(move[1]);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (h.direct === view) leaveDirect(h, false);
    h.views.delete(view);
    h.byElement.delete(container);
    h.visibility.unobserve(container);
    h.resizes.unobserve(container);
    updateLoop(h);
    container.removeEventListener('keydown', onKeyDown);
    orbit?.dispose();
    mixer?.stopAllAction();
    model?.traverse((object) => object.skeleton?.dispose()); // clones own only their skeletons
    if (acquired) releaseModel(src);
    canvas.remove();
    if (poster) poster.style.visibility = '';
    if (!h.views.size) h.lingering = setTimeout(() => disposeHub(h), HUB_LINGER_MS);
  }

  try {
    const loading = acquireModel(src, onProgress);
    acquired = true;
    const gltf = await loading;
    signal?.throwIfAborted();
    model = cloneModel(gltf.scene);
    scene.add(model);

    if (autoplay && gltf.animations.length && !reducedMotion) {
      mixer = new AnimationMixer(model);
      const clip = (animation && AnimationClip.findByName(gltf.animations, animation)) || gltf.animations[0];
      mixer.clipAction(clip).play();
      mixer.update(0); // measure the animated pose, not the bind pose
    }
    fitSphere(model, bounds);
    model.position.sub(bounds.center);
    bounds.center.set(0, 0, 0);

    if (controls || autoRotate) {
      // On the container, so input works whichever canvas is on top.
      orbit = new OrbitControls(camera, container);
      orbit.enabled = controls;
      orbit.enableDamping = true;
      orbit.enablePan = false;
      orbit.enableZoom = zoom;
      // The default two-finger mode (dolly-pan) does nothing with zoom and pan off, so a second
      // finger mid-drag kept rotating from the first finger's start and the model jumped.
      if (!zoom) orbit.touches.TWO = TOUCH.DOLLY_ROTATE;
      orbit.autoRotate = autoRotate && !reducedMotion;
      // OrbitControls sets touch-action:none, which blocks page scroll and page zoom on touch.
      // Without model zoom, vertical swipes scroll and pinches zoom the page, as over a photo;
      // horizontal drags still orbit.
      container.style.touchAction = !controls ? '' : zoom ? 'none' : 'pan-y pinch-zoom';
    }
    if (controls) {
      container.addEventListener('keydown', onKeyDown);
      if (!container.hasAttribute('tabindex')) container.tabIndex = 0;
    }

    // Compile shaders without blocking the main thread, before the first frame.
    // Without the extension compileAsync() saves nothing and logs a warning.
    if (h.renderer.extensions.has('KHR_parallel_shader_compile')) {
      await h.renderer.compileAsync(scene, camera);
      signal?.throwIfAborted();
    }

    container.append(canvas);
    view.ready = true;
    resize(); // sizes the canvas, frames the model, and draws the first frame
    if (!shown) draw();
    h.byElement.set(container, view);
    h.resizes.observe(container);
    h.visibility.observe(container);

    return {
      renderer: h.renderer, // shared by every view on the page
      scene,
      camera,
      model, // this view's clone; gltf.scene is the shared original
      gltf,
      canvas,
      controls: orbit,
      mixer,
      get renderCount() {
        return view.renderCount;
      },
      requestRender: () => (view.needsRender = true),
      // Current frame as a data URL (posters, share images), through this view's own canvas.
      snapshot(type = 'image/png', quality) {
        const direct = h.direct === view;
        if (direct) h.direct = null;
        renderView(h, view);
        if (direct) h.direct = view;
        view.needsRender = true;
        return canvas.toDataURL(type, quality);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
