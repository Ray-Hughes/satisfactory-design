// app/javascript/controllers/planner_controller.js
import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = {
    projectId: Number,
    projectData: String
  };

  static targets = ["foundationOptions"];

  connect() {
    // 1) Parse existing layoutData (or default if none)
    try {
      this.layoutData = JSON.parse(this.projectDataValue || "{}");
    } catch (err) {
      console.error("Invalid JSON in project-data:", err);
      this.layoutData = {};
    }

    // Ensure defaults
    this.layoutData.placed_nodes ||= [];
    this.layoutData.buildings ||= [];
    this.layoutData.conveyors ||= [];
    this.layoutData.power_lines ||= [];
    this.layoutData.balancers ||= [];
    this.layoutData.factory_area ||= null;    // { x, y, width, height }
    this.layoutData.grid_on = this.layoutData.grid_on ?? true; // default to grid on
    this.layoutData.foundation ||= {};        // e.g. { size: 4, material: "concrete" }

    // 2) Cache references
    this.overlayLayer = this.element.querySelector("#layout-layer");
    this.overlaySvg   = this.element.querySelector("#factory-overlay");
    this.rootDiv      = this.element; // main planner div

    // 3) Render any pre‐existing factory_area
    this.renderFactoryArea();

    // 4) Listen for map‐node clicks to place nodes (existing code)
    window.addEventListener("node:clicked", this.addNodeToLayout.bind(this));

    // 5) Track whether we’re in “select area” mode
    this.isSelectingArea = false;
    this.selectionRect  = null;  // the <rect> SVG element
    this.startPoint     = null;  // { x, y } in viewBox coords

    // 6) Listen for all foundation/material button clicks
    // (Handled by data-action in HTML)
  }

  disconnect() {
    window.removeEventListener("node:clicked", this.addNodeToLayout);
    this.cancelAreaSelection(); // clean any event listeners if needed
  }

  /* ---------- GRID TOGGLE ---------- */
  toggleGrid(event) {
    this.layoutData.grid_on = event.target.checked;
    console.log("Grid toggled:", this.layoutData.grid_on);
    // (Re‐draw the existing factory area to re‐snap if necessary)
    this.renderFactoryArea();
  }

  /* ---------- START AREA SELECTION ---------- */
  startAreaSelect() {
    if (this.isSelectingArea) return;  // already in select mode

    this.isSelectingArea = true;
    this.rootDiv.classList.add("cursor-crosshair");

    // Listen for mousedown on the overlay to begin the drag
    this.overlaySvg.addEventListener("mousedown", this.beginDrag.bind(this));
    console.log("Area selection mode activated");
  }

  /* ---------- DRAG BEHAVIOR ---------- */
  beginDrag(event) {
    if (!this.isSelectingArea) return;

    // 1) Convert mouse event to SVG (viewBox) coords
    const [x0, y0] = this.getSvgCoords(event);

    // 2) If grid is on, snap starting point to nearest 4 m
    const snap = (v) => Math.round(v / 4) * 4;
    this.startPoint = {
      x: this.layoutData.grid_on ? snap(x0) : x0,
      y: this.layoutData.grid_on ? snap(y0) : y0
    };

    // 3) Create a new <rect> in the overlay to represent selection
    const svgNs = "http://www.w3.org/2000/svg";
    this.selectionRect = document.createElementNS(svgNs, "rect");
    this.selectionRect.setAttribute("x", this.startPoint.x);
    this.selectionRect.setAttribute("y", this.startPoint.y);
    this.selectionRect.setAttribute("width", 0);
    this.selectionRect.setAttribute("height", 0);
    this.selectionRect.setAttribute("fill", "rgba(34, 197, 94, 0.3)"); // semi‐transparent green
    this.selectionRect.setAttribute("stroke", "#22c55e");
    this.selectionRect.setAttribute("stroke-width", 2);
    this.selectionRect.setAttribute("pointer-events", "none"); // ignore mouse events
    this.overlaySvg.appendChild(this.selectionRect);

    // 4) Listen for mousemove and mouseup on the window
    window.addEventListener("mousemove", this.updateDrag.bind(this));
    window.addEventListener("mouseup", this.endDrag.bind(this));
  }

  updateDrag(event) {
    if (!this.isSelectingArea || !this.selectionRect) return;

    // Compute current pointer in SVG coords
    const [x1, y1] = this.getSvgCoords(event);

    let x = x1, y = y1;
    if (this.layoutData.grid_on) {
      const snap = (v) => Math.round(v / 4) * 4;
      x = snap(x1);
      y = snap(y1);
    }

    // Calculate rectangle bounds (xMin, yMin, width, height)
    const xMin = Math.min(this.startPoint.x, x);
    const yMin = Math.min(this.startPoint.y, y);
    const width  = Math.abs(x - this.startPoint.x);
    const height = Math.abs(y - this.startPoint.y);

    // Update the <rect> attributes
    this.selectionRect.setAttribute("x", xMin);
    this.selectionRect.setAttribute("y", yMin);
    this.selectionRect.setAttribute("width", width);
    this.selectionRect.setAttribute("height", height);
  }

  endDrag() {
    if (!this.isSelectingArea) return;

    // Stop listening to move/up
    window.removeEventListener("mousemove", this.updateDrag);
    window.removeEventListener("mouseup",   this.endDrag);

    // Record the final rectangle in layoutData
    const x       = parseFloat(this.selectionRect.getAttribute("x"));
    const y       = parseFloat(this.selectionRect.getAttribute("y"));
    const width   = parseFloat(this.selectionRect.getAttribute("width"));
    const height  = parseFloat(this.selectionRect.getAttribute("height"));

    this.layoutData.factory_area = { x, y, width, height };

    console.log("Factory area selected:", this.layoutData.factory_area);

    // Reveal foundation options UI
    this.foundationOptionsTarget.classList.remove("hidden");

    // Exit selection mode (keep the rect visible)
    this.isSelectingArea = false;
    this.rootDiv.classList.remove("cursor-crosshair");
    this.overlaySvg.removeEventListener("mousedown", this.beginDrag);

    // Note: we keep `this.selectionRect` in the DOM so the user can see the chosen area.
  }

  cancelAreaSelection() {
    // If we need to abort area selection prematurely (e.g., on disconnect)
    if (this.selectionRect) {
      this.selectionRect.remove();
      this.selectionRect = null;
    }
    this.isSelectingArea = false;
    this.rootDiv.classList.remove("cursor-crosshair");
    this.overlaySvg.removeEventListener("mousedown", this.beginDrag);
    window.removeEventListener("mousemove", this.updateDrag);
    window.removeEventListener("mouseup",   this.endDrag);
  }

  /* ---------- RENDER AN EXISTING FACTORY AREA ---------- */
  renderFactoryArea() {
    // Remove any prior rect
    const existing = this.overlaySvg.querySelector("rect#factory-area");
    if (existing) existing.remove();

    const area = this.layoutData.factory_area;
    if (!area) return;

    const svgNs = "http://www.w3.org/2000/svg";
    const rect = document.createElementNS(svgNs, "rect");
    rect.setAttribute("id", "factory-area");
    rect.setAttribute("x", area.x);
    rect.setAttribute("y", area.y);
    rect.setAttribute("width", area.width);
    rect.setAttribute("height", area.height);
    rect.setAttribute("fill", "rgba(34, 197, 94, 0.3)");
    rect.setAttribute("stroke", "#22c55e");
    rect.setAttribute("stroke-width", 2);
    rect.setAttribute("pointer-events", "none");
    this.overlaySvg.appendChild(rect);

    // If foundation was chosen already, add a visual indicator inside this rect (e.g., a hatch or color overlay)
    if (this.layoutData.foundation.size && this.layoutData.foundation.material) {
      // Example: change opacity or pattern based on material
      rect.setAttribute("fill", this.foundationColor(this.layoutData.foundation.material, 0.3));
    }

    // Also reveal the foundation UI if not already visible
    if (this.foundationOptionsTarget.classList.contains("hidden")) {
      this.foundationOptionsTarget.classList.remove("hidden");
    }
  }

  foundationColor(material, alpha = 0.3) {
    switch (material) {
      case "concrete":
        return `rgba(107, 114, 128, ${alpha})`; // gray-500
      case "metal":
        return `rgba(156, 163, 175, ${alpha})`; // gray-400
      case "fiberglass":
        return `rgba(22, 163, 74, ${alpha})`;   // green-600
      default:
        return `rgba(34, 197, 94, ${alpha})`;    // fallback green
    }
  }

  /* ---------- FOUNDATION SIZE & MATERIAL ---------- */
  chooseFoundationSize(event) {
    const size = parseInt(event.currentTarget.dataset.plannerSizeValue, 10);
    this.layoutData.foundation.size = size;
    console.log("Foundation size set to", size, "m");
    // Optionally re-render the area to visualize grid inside
    this.renderFactoryArea();
  }

  chooseMaterial(event) {
    const material = event.currentTarget.dataset.plannerMaterialValue;
    this.layoutData.foundation.material = material;
    console.log("Foundation material set to", material);
    // Change the area’s fill to reflect material
    this.renderFactoryArea();
  }

  /* ---------- NODE PLACEMENT (existing behavior) ---------- */
  addNodeToLayout(event) {
    const node = event.detail;
    const placed = {
      node_id: node.id,
      position: { x: node.latitude, y: node.longitude },
      thumbnail_url: node.thumbnail_url
    };
    this.layoutData.placed_nodes.push(placed);
    this.renderNode(placed);
  }

  renderNode(placed) {
    const { x, y } = placed.position;
    const size = 24;
    const svgNs = "http://www.w3.org/2000/svg";
    const img = document.createElementNS(svgNs, "image");
    img.setAttributeNS(null, "href", placed.thumbnail_url);
    img.setAttributeNS(null, "x", x - size / 2);
    img.setAttributeNS(null, "y", y - size / 2);
    img.setAttributeNS(null, "width", size);
    img.setAttributeNS(null, "height", size);
    this.overlayLayer.appendChild(img);
  }

  /* ---------- SAVE & EXPORT ---------- */
  saveProject() {
    fetch(`/factory_projects/${this.projectIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ data: this.layoutData })
    })
      .then((resp) => {
        if (!resp.ok) throw new Error("Save failed");
        return resp.json();
      })
      .then(() => alert("Project saved!"))
      .catch((err) => {
        console.error(err);
        alert("Error saving project: " + err.message);
      });
  }

  exportJSON() {
    const dataStr = JSON.stringify(this.layoutData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factory_project_${this.projectIdValue}_layout.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------- HELPERS: CONVERT CLIENT COORDS → SVG VIEWBOX COORDS ---------- */
  getSvgCoords(evt) {
    // Standard approach: create an SVGPoint, then transform by inverse of CTM
    const svg = this.overlaySvg;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [svgP.x, svgP.y];
  }
}
