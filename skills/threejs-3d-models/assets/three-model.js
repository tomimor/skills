// <three-model src="/models/chair.glb" alt="Oak lounge chair" camera-controls auto-rotate>
//   <img src="/models/chair-poster.webp" alt="Oak lounge chair" width="800" height="800">
// </three-model>
//
// Framework-agnostic custom element with no three.js in the initial bundle:
// mount-model.js (and three.js with it) is imported only when the element
// nears the viewport. The <img> child is the poster: LCP candidate, loading
// placeholder, and the fallback if WebGL or the model fails.
//
// Required page CSS (the element must have a size before the model loads):
//   three-model { display: block; aspect-ratio: 1; }
//   three-model > img { display: block; width: 100%; height: 100%; object-fit: contain; }
//
// Attributes: src, alt, camera-controls, zoom, auto-rotate, autoplay, exposure.
// Events: "load" (first frame is on screen), "error" (poster stays; detail = Error).
const LOAD_MARGIN = '300px';

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
    this.setAttribute('aria-busy', 'true');
    try {
      const { mountModel } = await import('./mount-model.js');
      abort.signal.throwIfAborted();
      const viewer = await mountModel(this, {
        src: this.getAttribute('src'),
        poster: this.querySelector(':scope > img'),
        controls: this.hasAttribute('camera-controls'),
        zoom: this.hasAttribute('zoom'),
        autoRotate: this.hasAttribute('auto-rotate'),
        autoplay: this.hasAttribute('autoplay'),
        exposure: Number(this.getAttribute('exposure') ?? 1),
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
