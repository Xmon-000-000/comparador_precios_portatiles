const GPU_SCORES = { "RTX 5060": 60, "RTX 5070": 85, "RTX 5080": 100 };
const RAM_SCORES = { 16: 10, 24: 15, 32: 20, 64: 30 };

export function scoreProduct(product) {
  const gpuScore = GPU_SCORES[product.gpu] ?? 0;
  const ramScore = RAM_SCORES[product.ram] ?? Math.floor(product.ram / 2);
  return {
    ...product,
    gpuScore,
    ramScore,
    powerScore: gpuScore + product.cpuScore,
    valuePerEuro: product.bestPrice > 0 ? (gpuScore + ramScore) / product.bestPrice : 0,
  };
}

export function rankProducts(products) {
  return [...products].sort((a, b) => b.valuePerEuro - a.valuePerEuro);
}