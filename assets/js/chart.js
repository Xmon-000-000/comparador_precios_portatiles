const PALETTE = ["#167a68", "#e76c46", "#3276a8", "#c59a31", "#7461a8", "#bd5365", "#4c8061", "#5c728d", "#b27237", "#498d91"];
const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function renderHistoryChart(history, products, selectedId) {
  const canvas = document.querySelector("#price-chart");
  const fallback = document.querySelector("#chart-fallback");
  if (!window.Chart || !canvas) {
    fallback.hidden = false;
    return;
  }
  fallback.hidden = true;
  window.priceHistoryChart?.destroy();

  const chosen = selectedId === "all" ? history.models : history.models.filter((model) => model.id === selectedId);
  const datasets = chosen.map((model, index) => {
    const product = products.find((item) => item.id === model.id);
    const color = PALETTE[index % PALETTE.length];
    return {
      label: product ? `${product.brand} ${product.model}` : model.id,
      data: model.prices,
      borderColor: color,
      backgroundColor: color,
      borderWidth: selectedId === "all" ? 2 : 2.5,
      pointRadius: selectedId === "all" ? 1.5 : 3,
      pointHoverRadius: 5,
      tension: 0.32,
      spanGaps: false,
    };
  });

  window.priceHistoryChart = new window.Chart(canvas, {
    type: "line",
    data: { labels: history.dates, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 18, color: "#56615e", font: { family: "Manrope", size: 11 } } },
        tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${euro.format(context.parsed.y)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#7c8582", font: { family: "DM Mono", size: 10 } }, border: { display: false } },
        y: { grid: { color: "#edf0ee" }, ticks: { color: "#7c8582", font: { family: "DM Mono", size: 10 }, callback: (value) => `${value} €` }, border: { display: false } },
      },
    },
  });
}

export function updateHistoryStats(history, products, selectedId) {
  const selected = selectedId === "all"
    ? history.models
    : history.models.filter((model) => model.id === selectedId);
  const values = selected.flatMap((model) => model.prices.filter(Number.isFinite));
  const currentValues = selected.map((model) => {
    const product = products.find((item) => item.id === model.id);
    return product?.bestPrice ?? model.prices.at(-1);
  }).filter(Number.isFinite);
  const changes = selected.map((model) => {
    const first = model.prices.find(Number.isFinite);
    const last = model.prices.at(-1);
    return first ? ((last - first) / first) * 100 : 0;
  });
  const average = (items) => items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : 0;
  const set = (selector, text) => { document.querySelector(selector).textContent = text; };

  set("#history-current", euro.format(average(currentValues)));
  set("#history-min", values.length ? euro.format(Math.min(...values)) : "—");
  set("#history-max", values.length ? euro.format(Math.max(...values)) : "—");
  const change = average(changes);
  set("#history-change", `${change > 0 ? "+" : ""}${change.toFixed(1)}%`);
  document.querySelector("#history-change").classList.toggle("negative-change", change > 0);
}