// app/javascript/controllers/map_controller.js
import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = {
    width: Number,
    height: Number,
    backgroundUrl: String
  };

  connect() {
    this.svgNs = "http://www.w3.org/2000/svg";
    this.tooltipEl = document.getElementById("node-tooltip");
    this.fetchAndRenderNodes();
  }

  async fetchAndRenderNodes() {
    try {
      const response = await fetch("/api/v1/resource_nodes");
      if (!response.ok) throw new Error("Network response was not ok");
      const nodes = await response.json();
      const layer = this.element.querySelector("#nodes-layer");

      nodes.forEach((node) => {
        const x = node.latitude;
        const y = node.longitude;
        const iconSize = 24;

        const img = document.createElementNS(this.svgNs, "image");
        img.setAttributeNS(null, "href", node.thumbnail_url);
        img.setAttributeNS(null, "x", x - iconSize / 2);
        img.setAttributeNS(null, "y", y - iconSize / 2);
        img.setAttributeNS(null, "width", iconSize);
        img.setAttributeNS(null, "height", iconSize);
        img.classList.add("node-icon");
        img.dataset.nodeId = node.id;

        img.addEventListener("mouseenter", (e) => this.showTooltip(e, node));
        img.addEventListener("mouseleave", () => this.hideTooltip());
        img.addEventListener("click", () => this.selectNode(node));

        layer.appendChild(img);
      });
    } catch (error) {
      console.error("Error fetching nodes:", error);
    }
  }

  showTooltip(event, node) {
    this.tooltipEl.innerHTML = `
      <strong class="block">${node.name}</strong>
      <span class="block">${node.resource_type.replace("_", " ").toUpperCase()}</span>
    `;
    const tooltipX = event.clientX + 12;
    const tooltipY = event.clientY - 28;
    this.tooltipEl.style.left = `${tooltipX}px`;
    this.tooltipEl.style.top = `${tooltipY}px`;
    this.tooltipEl.style.display = "block";
  }

  hideTooltip() {
    this.tooltipEl.style.display = "none";
  }

  selectNode(node) {
    // Dispatch a custom event
    const evt = new CustomEvent("node:clicked", { detail: node });
    window.dispatchEvent(evt);
  }
}
