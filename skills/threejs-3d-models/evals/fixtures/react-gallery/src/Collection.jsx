import { products } from './products.js';
import ProductCard from './ProductCard.jsx';

export default function Collection() {
  return (
    <section className="collection">
      <h1>The collection</h1>
      <div className="grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
