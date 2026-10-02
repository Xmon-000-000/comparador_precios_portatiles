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
  const ranked = products
    .filter((product) => product.offers[storeKey]?.price > 0)
    .map((product) => ({
      ...product,
      storeOffer: product.offers[storeKey],
      storeValue: (product.gpuScore + product.ramScore) / product.offers[storeKey].price,
    }))
    .sort((a, b) => b.storeValue - a.storeValue)
    .slice(0, 10);
  const storeName = storeKey === "amazon" ? "Amazon" : "PcComponentes";
  document.querySelector(rowsSelector).innerHTML = ranked.map((product, index) => `
    <tr>
      <td class="rank-position">${String(index + 1).padStart(2, "0")}</td>
      <td class="rank-config"><strong>${escapeHtml(product.brand)} ${escapeHtml(product.model)}</strong><span>${escapeHtml(product.cpu)} · ${escapeHtml(product.panel)}</span></td>
      <td><span class="gpu-tag gpu-${product.gpuScore}">${escapeHtml(product.gpu)}</span><span class="spec-secondary">${product.gpuVram} GB VRAM</span></td>
      <td>${product.ram} GB · ${escapeHtml(product.ssdLabel)}</td>
      <td class="numeric rank-store-price">${currency.format(product.storeOffer.price)}</td>
      <td><span class="value-badge">${product.storeValue.toFixed(3)}</span></td>
      <td class="rank-source"><a href="${escapeHtml(product.storeOffer.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(product.storeOffer.seller)} · ${escapeHtml(product.storeOffer.updatedAt || product.updatedAt)} ↗</a></td>
    </tr>`).join("");
  document.querySelector(countSelector).textContent = `${ranked.length} / 10 capturas`;
  const missing = Math.max(0, 10 - ranked.length);
  document.querySelector(coverageSelector).textContent = missing
    ? `Hay ${ranked.length} precios confirmados en ${storeName}; faltan ${missing} para completar diez.`
    : `10 precios observados en ${storeName}; el ranking cubre las capturas guardadas, no todo su catálogo.`;
}

function renderKpis() {
  const cheapest = [...products].sort((a, b) => a.bestPrice - b.bestPrice)[0];
  const bestValue = rankProducts(products)[0];
  const bestOffer = products.reduce((best, product) => product.bestPrice < best.bestPrice ? product : best, products[0]);
  const average = products.reduce((sum, product) => sum + product.bestPrice, 0) / products.length;
  document.querySelector("#kpi-count").textContent = number.format(products.length);
  document.querySelector("#kpi-deal").textContent = currency.format(bestOffer.bestPrice);
  document.querySelector("#kpi-deal-name").textContent = `${bestOffer.brand} ${bestOffer.model}`;
  document.querySelector("#kpi-average").textContent = currency.format(average);
  document.querySelector("#kpi-cheapest").textContent = currency.format(cheapest.bestPrice);
  document.querySelector("#kpi-cheapest-name").textContent = `${cheapest.brand} ${cheapest.model}`;
  document.querySelector("#kpi-score").textContent = bestValue.valuePerEuro.toFixed(3);
  document.querySelector("#kpi-score-name").textContent = `${bestValue.brand} ${bestValue.model}`;
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
    products = catalog.products.map((item) => {
      const current = prices.products.find((price) => price.id === item.id);
      if (!current) return null;
      const offers = current.offers;
      const available = Object.values(offers).filter(Boolean).map((offer) => offer.price);
      if (!available.length) return null;
      return scoreProduct({ ...item, offers, bestPrice: Math.min(...available), priceDifference: Math.abs(offers.amazon && offers.pccomponentes ? offers.amazon.price - offers.pccomponentes.price : 0), updatedAt: current.updatedAt });
    }).filter(Boolean);
    setupHistorySelector();
    renderKpis();
    renderStoreRanking("amazon", "#amazon-ranking-rows", "#amazon-count", "#amazon-coverage");
    renderStoreRanking("pccomponentes", "#pccomponentes-ranking-rows", "#pccomponentes-count", "#pccomponentes-coverage");
    document.querySelector("#result-count").textContent = `${products.length} configuraciones verificadas`;
    renderHistory();
  } catch (error) {
    console.error("Error al iniciar PrecioPulso:", error);
    document.querySelector("#load-error").hidden = false;
    document.querySelector("#amazon-ranking-rows").innerHTML = '<tr><td class="loading-cell" colspan="7">No se pudieron cargar las capturas.</td></tr>';
    document.querySelector("#pccomponentes-ranking-rows").innerHTML = '<tr><td class="loading-cell" colspan="7">No se pudieron cargar las capturas.</td></tr>';
  }
}

start();