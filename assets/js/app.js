import { renderHistoryChart, updateHistoryStats } from "./chart.js";
import { rankProducts, scoreProduct } from "./ranking.js";

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("es-ES");
let products = [];
let history = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function renderStoreRanking(storeKey, rowsSelector, countSelector, coverageSelector) {
  const priced = [];
  const unpriced = [];
  for (const product of products) {
    const offer = product.offers[storeKey];
    const price = typeof offer?.price === "number" ? offer.price : null;
    if (price === null || price <= 0 || price > 2000) {
      unpriced.push({ ...product, storeOffer: null, storeValue: null });
      continue;
    }
    priced.push({ ...product, storeOffer: offer, storeValue: (product.gpuScore + product.ramScore) / price });
  }
  const ranked = [...priced.sort((a, b) => b.storeValue - a.storeValue), ...unpriced];
  const storeName = storeKey === "amazon" ? "Amazon" : "PcComponentes";
  document.querySelector(rowsSelector).innerHTML = ranked.map((product, index) => `
    <tr class="${product.storeOffer ? "" : "row-no-price"}">
      <td class="rank-position">${String(index + 1).padStart(2, "0")}</td>
      <td class="rank-config"><strong>${escapeHtml(product.brand)} ${escapeHtml(product.model)}</strong><span>${escapeHtml(product.cpu)} · ${escapeHtml(product.panel)}</span></td>
      <td><span class="gpu-tag gpu-${product.gpuScore}">${escapeHtml(product.gpu)}</span><span class="spec-secondary">${product.gpuVram} GB VRAM</span></td>
      <td>${product.ram} GB · ${escapeHtml(product.ssdLabel)}</td>
      <td class="numeric rank-store-price">${product.storeOffer ? currency.format(product.storeOffer.price) : "null"}</td>
      <td>${product.storeOffer ? `<span class="value-badge">${product.storeValue.toFixed(3)}</span>` : "null"}</td>
      <td class="rank-source">${product.storeOffer ? `<a href="${escapeHtml(product.storeOffer.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(product.storeOffer.seller)} · ${escapeHtml(product.storeOffer.updatedAt && product.storeOffer.updatedAt === product.captureDate ? product.storeOffer.updatedAt : "—")} ↗</a>` : "null"}</td>
    </tr>`).join("");
  document.querySelector(countSelector).textContent = `${priced.length} / 10 capturas`;
  const missing = Math.max(0, 10 - priced.length);
  document.querySelector(coverageSelector).textContent = `${priced.length} precios confirmados en ${storeName}; ${unpriced.length} sin precio hoy (null)${missing ? `; faltan ${missing} para completar diez` : ""}.`;
}

function renderKpis() {
  const affordable = products.filter((product) => typeof product.bestPrice === "number" && product.bestPrice > 0 && product.bestPrice <= 2000);
  const priced = affordable.length ? affordable : products;
  const cheapest = [...priced].sort((a, b) => (a.bestPrice ?? Infinity) - (b.bestPrice ?? Infinity))[0];
  const bestValue = rankProducts(affordable)[0] || cheapest;
  const bestOffer = priced.reduce((best, product) => !best || (product.bestPrice ?? Infinity) < (best.bestPrice ?? Infinity) ? product : best, cheapest);
  const average = priced.reduce((sum, product) => sum + (product.bestPrice ?? 0), 0) / (priced.length || 1);
  const price = (value) => typeof value === "number" && value > 0 ? currency.format(value) : "null";
  document.querySelector("#kpi-count").textContent = number.format(products.length);
  document.querySelector("#kpi-deal").textContent = price(bestOffer?.bestPrice);
  document.querySelector("#kpi-deal-name").textContent = bestOffer ? `${bestOffer.brand} ${bestOffer.model}` : "—";
  document.querySelector("#kpi-average").textContent = price(average);
  document.querySelector("#kpi-cheapest").textContent = price(cheapest?.bestPrice);
  document.querySelector("#kpi-cheapest-name").textContent = cheapest ? `${cheapest.brand} ${cheapest.model}` : "—";
  document.querySelector("#kpi-score").textContent = bestValue?.valuePerEuro ? bestValue.valuePerEuro.toFixed(3) : "null";
  document.querySelector("#kpi-score-name").textContent = bestValue ? `${bestValue.brand} ${bestValue.model}` : "—";
}

function renderHistory() {
  const selectedId = document.querySelector("#history-model").value;
  updateHistoryStats(history, products, selectedId);
  renderHistoryChart(history, products, selectedId);
}

function setupHistorySelector() {
  for (const product of products) {
    document.querySelector("#history-model").insertAdjacentHTML("beforeend", `<option value="${escapeHtml(product.id)}">${escapeHtml(product.brand)} ${escapeHtml(product.model)}</option>`);
  }
  document.querySelector("#history-model").addEventListener("change", renderHistory);
}

async function start() {
  try {
    const [catalogResponse, pricesResponse, historyResponse] = await Promise.all([
      fetch("data/catalogo.json"), fetch("data/precios.json"), fetch("data/historico.json"),
    ]);
    if (![catalogResponse, pricesResponse, historyResponse].every((response) => response.ok)) throw new Error("No se pudieron descargar los datos JSON");
    const [catalog, prices, priceHistory] = await Promise.all([catalogResponse.json(), pricesResponse.json(), historyResponse.json()]);
    history = priceHistory;
    const captureDate = prices.captureDate || "—";
    document.querySelector("#capture-date").textContent = `CAPTURAS · ${captureDate}`;
    document.querySelector("#capture-date-title").textContent = `CAPTURAS DEL ${captureDate}`;
    products = catalog.products.map((item) => {
      const current = prices.products.find((price) => price.id === item.id);
      const offers = (current?.offers) || { amazon: null, pccomponentes: null };
      const available = Object.values(offers).filter((offer) => typeof offer?.price === "number" && offer.price > 0).map((offer) => offer.price);
      const bestPrice = available.length ? Math.min(...available) : null;
      const amazonPrice = offers.amazon?.price;
      const pcPrice = offers.pccomponentes?.price;
      const priceDifference = typeof amazonPrice === "number" && typeof pcPrice === "number" ? Math.abs(amazonPrice - pcPrice) : 0;
      return scoreProduct({ ...item, offers, bestPrice, priceDifference, updatedAt: current?.updatedAt ?? null, captureDate });
    });
    setupHistorySelector();
    renderKpis();
    renderStoreRanking("amazon", "#amazon-ranking-rows", "#amazon-count", "#amazon-coverage");
    renderStoreRanking("pccomponentes", "#pccomponentes-ranking-rows", "#pccomponentes-count", "#pccomponentes-coverage");
    document.querySelector("#result-count").textContent = `${products.filter((product) => typeof product.bestPrice === "number" && product.bestPrice <= 2000).length} configuraciones verificadas · ${products.length} en catálogo`;
    renderHistory();
  } catch (error) {
    console.error("Error al iniciar PrecioPulso:", error);
    document.querySelector("#load-error").hidden = false;
    document.querySelector("#amazon-ranking-rows").innerHTML = '<tr><td class="loading-cell" colspan="7">No se pudieron cargar las capturas.</td></tr>';
    document.querySelector("#pccomponentes-ranking-rows").innerHTML = '<tr><td class="loading-cell" colspan="7">No se pudieron cargar las capturas.</td></tr>';
  }
}

start();