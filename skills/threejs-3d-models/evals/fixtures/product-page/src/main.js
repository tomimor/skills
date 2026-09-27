const count = document.getElementById('cart-count');
document.getElementById('add-to-cart').addEventListener('click', () => {
  count.textContent = String(Number(count.textContent) + 1);
});
