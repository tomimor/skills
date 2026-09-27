// <three-model src="/models/chair.glb" alt="Oak lounge chair" camera-controls auto-rotate>
//   <img src="/models/chair-poster.webp" alt="Oak lounge chair" width="800" height="800">
// </three-model>
//
// Framework-agnostic custom element with no three.js in the initial bundle:
// mount-model.js (and three.js with it) is imported only when the element
// nears the viewport and its poster has loaded. The <img> child is the poster:
// LCP candidate, loading placeholder, and the fallback if WebGL or the model
// fails.
//
// Required page CSS (the element must have a size before the model loads):
//   three-model { display: block; aspect-ratio: 1; }
//   three-model > img { display: block; width: 100%; height: 100%; object-fit: contain; }
//
// Attributes: src, alt, camera-controls, zoom, auto-rotate, autoplay, animation, exposure.
// Events: "load" (first frame is on screen), "error" (poster stays; detail = Error).
const LOAD_MARGIN = '300px';

function posterSettled(img, signal) {
  if (!img || img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
    signal.addEventListener('abort', resolve, { once: true });
  });
}

// Probed once per page, and the probe context is released at once, so browsers
// without WebGL 2 keep the poster without downloading three.js.
let webgl2;
function hasWebGL2() {
  if (webgl2 === undefined) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      webgl2 = Boolean(gl);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}

class ThreeModel extends HTMLElement {
  #viewer = null;
  #abort = null;
  #observer = null;

  get viewer() {
    return this.#viewer;
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'img');
    if (this.hasAttribute('alt')) this.setAttribute('aria-label', this.getAttribute('alt'));
    this.#observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && this.#load(),
      { rootMargin: LOAD_MARGIN },
    );
    this.#observer.observe(this);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#abort?.abort();
    this.#viewer?.dispose();
    this.#viewer = this.#abort = this.#observer = null;
  }

  async #load() {
    this.#observer?.disconnect();
    if (!this.isConnected) return;
    const abort = (this.#abort = new AbortController());
    const poster = this.querySelector(':scope > img');
    this.setAttribute('aria-busy', 'true');
    try {
      // The poster is usually the LCP image; on a slow connection, three.js and the
      // model downloading alongside it would delay it.
      await posterSettled(poster, abort.signal);
      abort.signal.throwIfAborted();
      if (!hasWebGL2()) throw new Error('WebGL 2 is not available');
      const { mountModel } = await import('./mount-model.js');
      abort.signal.throwIfAborted();
      const exposure = Number.parseFloat(this.getAttribute('exposure'));
      const viewer = await mountModel(this, {
        src: this.getAttribute('src'),
        poster,
        controls: this.hasAttribute('camera-controls'),
        zoom: this.hasAttribute('zoom'),
        autoRotate: this.hasAttribute('auto-rotate'),
        autoplay: this.hasAttribute('autoplay'),
        animation: this.getAttribute('animation'),
        exposure: Number.isFinite(exposure) ? exposure : 1,
        signal: abort.signal,
      });
      if (abort.signal.aborted) return viewer.dispose(); // removed as the first frame landed
      this.#viewer = viewer;
      this.dispatchEvent(new Event('load'));
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.warn('<three-model> is showing its poster instead:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    } finally {
      if (this.#abort === abort) this.removeAttribute('aria-busy');
    }
  }
}

if (!customElements.get('three-model')) customElements.define('three-model', ThreeModel);
