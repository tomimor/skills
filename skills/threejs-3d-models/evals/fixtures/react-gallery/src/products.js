const models = [
  { model: '/models/helmet.glb', thumbnail: '/thumbs/helmet.webp', name: 'Explorer Helmet' },
  { model: '/models/fox.glb', thumbnail: '/thumbs/fox.webp', name: 'Low-poly Fox' },
  { model: '/models/toycar.glb', thumbnail: '/thumbs/toycar.webp', name: 'Toy Car' },
  { model: '/models/coffeemat.glb', thumbnail: '/thumbs/coffeemat.webp', name: 'Cookie Machine' },
];

export const products = Array.from({ length: 24 }, (_, i) => {
  const base = models[i % models.length];
  return {
    id: i + 1,
    name: `${base.name} No. ${Math.floor(i / models.length) + 1}`,
    price: 49 + ((i * 17) % 90),
    model: base.model,
    thumbnail: base.thumbnail,
  };
});
