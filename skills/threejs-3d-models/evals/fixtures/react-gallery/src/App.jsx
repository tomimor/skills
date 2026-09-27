import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Collection from './Collection.jsx';

const routes = { '#/': Home, '#/collection': Collection };

export default function App() {
  const [hash, setHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const Page = routes[hash] ?? Home;
  return (
    <>
      <header className="header">
        <a className="brand" href="#/">Lumen</a>
        <nav>
          <a href="#/" aria-current={hash === '#/' ? 'page' : undefined}>Home</a>
          <a href="#/collection" aria-current={hash === '#/collection' ? 'page' : undefined}>Collection</a>
        </nav>
      </header>
      <main>
        <Page />
      </main>
    </>
  );
}
