export default function ProductCard({ product }) {
  return (
    <article className="card">
      <div className="card-media">
        <img src={product.thumbnail} alt={product.name} width="400" height="400" loading="lazy" />
      </div>
      <h2>{product.name}</h2>
      <p className="price">${product.price.toFixed(2)}</p>
    </article>
  );
}
