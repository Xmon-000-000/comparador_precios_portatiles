import { filterAndSort, readFilters } from "./filters.js";
import { renderHistoryChart, updateHistoryStats } from "./chart.js";
import { rankProducts, scoreProduct } from "./ranking.js";

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-ES");
let products = [];
let history = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function offerLink(offer, label) {
  return offer
    ? `<a class="store-link" href="${escapeHtml(offer.url)}" target="_blank" rel="noopener noreferrer">${currency.format(offer.price)}<span>${label} ↗</span></a>`
    : "<span class=\"unavailable\">—</span>";
}

function renderRows(items) {
  const body = document.querySelector("#product-rows");
  document.querySelector("#result-count").textContent = `${items.length} ${items.length === 1 ? "equipo" : "equipos"}`;
  document.querySelector("#empty-state").hidden = items.length > 0;
  if (!items.length) {
    body.innerHTML = "";
    return;
  }
  body.innerHTML = items.map((product) => `
    <tr>
      <td class="product-cell"><span class="product-vendor">${escapeHtml(product.brand)}</span><strong>${escapeHtml(product.model)}</strong><span class="mobile-spec">${escapeHtml(product.gpu)} · ${product.ram} GB · ${product.ssdLabel}</span></td>
      <td><span class="spec-primary">${escapeHtml(product.cpu)}</span></td>
      <td><span class="gpu-tag gpu-${product.gpuScore}">${escapeHtml(product.gpu)}</span></td>
      <td><span class="spec-primary">${product.ram} GB</span><span class="spec-secondary">${product.ssdLabel}</span></td>
      <td><span class="spec-primary">${product.screen}"</span><span class="spec-secondary">${escapeHtml(product.panel)}</span></td>
      <td class="numeric">${offerLink(product.offers.amazon, "Amazon")}</td>
      <td class="numeric">${offerLink(product.offers.pccomponentes, "PcComponentes")}</td>
      <td class="numeric best-price">${currency.format(product.bestPrice)}</td>
      <td class="numeric difference">${product.priceDifference ? currency.format(product.priceDifference) : "—"}</td>
      <td><span class="value-badge">${product.valuePerEuro.toFixed(3)}</span></td>
      <td class="updated-cell">${escapeHtml(product.updatedAt)}</td>
    </tr>`).join("");
}

function renderRanking() {
  const top = rankProducts(products).slice(0, 5);
  document.querySelector("#ranking-list").innerHTML = top.map((product, index) => `
    <article class="rank-item">
      <span class="rank-number">0${index + 1}</span>
      <div class="rank-copy"><strong>${escapeHtml(product.brand)} ${escapeHtml(product.model)}</strong><span>${escapeHtml(product.gpu)} · ${product.ram} GB RAM</span></div>
      <strong class="rank-price">${currency.format(product.bestPrice)}</strong>
      <span class="rank-score">${product.valuePerEuro.toFixed(3)}<small>VALOR / €</small></span>
    </article>`).join("");
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

function renderAll() {
  renderRows(filterAndSort(products, readFilters()));
}

function renderHistory() {
  const selectedId = document.querySelector("#history-model").value;
  updateHistoryStats(history, products, selectedId);
  renderHistoryChart(history, products, selectedId);
}

function setupFilters() {
  const brands = [...new Set(products.map((product) => product.brand))].sort();
  document.querySelector("#brand-filter").insertAdjacentHTML("beforeend", brands.map((brand) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`).join(""));
  for (const product of products) {
    document.querySelector("#history-model").insertAdjacentHTML("beforeend", `<option value="${escapeHtml(product.id)}">${escapeHtml(product.brand)} ${escapeHtml(product.model)}</option>`);
  }
  document.querySelectorAll(".filter-bar input, .filter-bar select").forEach((control) => control.addEventListener("input", renderAll));
  document.querySelector("#clear-filters").addEventListener("click", () => {
    document.querySelectorAll('.gpu-filter input[type="checkbox"]').forEach((input) => { input.checked = false; });
    document.querySelector("#brand-filter").value = "";
    document.querySelector("#price-filter").value = "";
    document.querySelector("#ram-filter").value = "0";
    document.querySelector("#ssd-filter").value = "0";
    document.querySelector("#sort-filter").value = "value";
    renderAll();
  });
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
    setupFilters();
    renderKpis();
    renderRanking();
    renderAll();
    renderHistory();
  } catch (error) {
    console.error("Error al iniciar FrameRate:", error);
    document.querySelector("#load-error").hidden = false;
    document.querySelector("#product-rows").innerHTML = '<tr><td class="loading-cell" colspan="11">No se pudo cargar el catálogo.</td></tr>';
  }
}

start();