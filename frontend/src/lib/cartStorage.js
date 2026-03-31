const CART_STORAGE_KEY = "eco-cart-lines";

export function loadCartLines() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCartLines(lines) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

export function clearCartLines() {
  localStorage.removeItem(CART_STORAGE_KEY);
}

export function addProductToCart(productId) {
  const prev = loadCartLines();
  const ix = prev.findIndex((line) => line.productId === productId);
  let next;
  if (ix >= 0) {
    next = [...prev];
    next[ix] = { ...next[ix], quantity: next[ix].quantity + 1 };
  } else {
    next = [...prev, { productId, quantity: 1, _name: null, _price: null, _eco: null }];
  }
  saveCartLines(next);
  return next;
}

