const valueOf = (selector) => document.querySelector(selector)?.value ?? "";

export function readFilters() {
  return {
    gpus: [...document.querySelectorAll('input[name="gpu"]:checked')].map((input) => input.value),
    brand: valueOf("#brand-filter"),
    maxPrice: Number(valueOf("#price-filter")) || Infinity,
    minRam: Number(valueOf("#ram-filter")) || 0,
    minSsd: Number(valueOf("#ssd-filter")) || 0,
    sort: valueOf("#sort-filter") || "value",
  };
}

export function filterAndSort(products, filters) {
  const visible = products.filter((product) =>
    (!filters.gpus.length || filters.gpus.includes(product.gpu)) &&
    (!filters.brand || filters.brand === product.brand) &&
    product.bestPrice <= filters.maxPrice &&
    product.ram >= filters.minRam &&
    product.ssd >= filters.minSsd,
  );

  const sorters = {
    value: (a, b) => b.valuePerEuro - a.valuePerEuro,
    price: (a, b) => a.bestPrice - b.bestPrice,
    power: (a, b) => b.powerScore - a.powerScore,
    cpu: (a, b) => b.cpuScore - a.cpuScore,
    gpu: (a, b) => b.gpuScore - a.gpuScore,
    ram: (a, b) => b.ram - a.ram,
  };
  return visible.sort(sorters[filters.sort] ?? sorters.value);
}