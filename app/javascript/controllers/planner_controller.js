import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = {
    projectId: Number,
    projectData: String
  };
  static targets = ["gridLayer", "foundationOptions"];

  connect() {
    console.log("🔧 planner controller connected");

    try {
      this.layoutData = JSON.parse(this.projectDataValue || "{}");
    } catch (e) {
      console.error("Invalid projectData JSON:", e);
      this.layoutData = {};
    }

    // Ensure defaults
    this.layoutData.placed_nodes = this.layoutData.placed_nodes || [];
    this.layoutData.buildings     = this.layoutData.buildings     || [];
    this.layoutData.conveyors     = this.layoutData.conveyors     || [];
    this.layoutData.power_lines   = this.layoutData.power_lines   || [];
    this.layoutData.balancers     = this.layoutData.balancers     || [];
    this.layoutData.factory_area  = this.layoutData.factory_area  || null;
    this.layoutData.grid_on       = this.layoutData.grid_on == null ? true : this.layoutData.grid_on;
    this.layoutData.foundation    = this.layoutData.foundation    || {};

    // 2) Cache SVG & layers
    this.svg         = this.element;                   // <svg data-controller="planner">
    this.gridLayer   = this.gridLayerTarget;           // <g data-planner-target="gridLayer">
    this.layoutLayer = this.svg.querySelector("#layout-layer");

    // 3) Zoom / grid settings
    this.zoomLevel     = 0;       // 0 = world, 1 = detail
    this.baseSpacing   = 50;      // world-grid spacing in viewBox units
    this.detailSpacing = 4;       // detail-grid spacing

    // 4) Initial draw
    this.renderGrid();
    this.renderFactoryArea();

    // 5) Event listeners
    this.svg.addEventListener("click", this.onCanvasClick.bind(this));
    window.addEventListener("node:clicked", this.addNodeToLayout.bind(this));

    // 6) Area‐selection state
    this.isSelectingArea = false;
    this.selectionRect   = null;
    this.startPoint      = null;
    console.log("Planner initialized with data:", this.layoutData);
  }

  disconnect() {
    this.svg.removeEventListener("click", this.onCanvasClick);
    window.removeEventListener("node:clicked", this.addNodeToLayout);
    this.cancelAreaSelection();
  }

  /*–––––– GRID & ZOOM ––––––*/

  renderGrid() {
    // Clear old grid
    this.gridLayer.innerHTML = "";
    const spacing = this.zoomLevel === 0 ? this.baseSpacing : this.detailSpacing;

    // Vertical lines
    for (let x = 0; x <= 2000; x += spacing) {
      const line = document.createElementNS(this.svg.namespaceURI, "line");
      line.setAttribute("x1", x);
      line.setAttribute("y1", 0);
      line.setAttribute("x2", x);
      line.setAttribute("y2", 1500);
      line.setAttribute("stroke", "#e5e7eb");
      line.setAttribute("stroke-width", "0.5");
      this.gridLayer.appendChild(line);
    }

    // Horizontal lines
    for (let y = 0; y <= 1500; y += spacing) {
      const line = document.createElementNS(this.svg.namespaceURI, "line");
      line.setAttribute("x1", 0);
      line.setAttribute("y1", y);
      line.setAttribute("x2", 2000);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", "#e5e7eb");
      line.setAttribute("stroke-width", "0.5");
      this.gridLayer.appendChild(line);
    }
  }

  onCanvasClick(event) {
    // Don’t zoom while dragging area
    if (this.isSelectingArea) return;

    if (this.zoomLevel === 0) {
      // Zoom in around click
      const pt = this.svg.createSVGPoint();
      pt.x = event.clientX; pt.y = event.clientY;
      const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());

      const vw = 400, vh = 300; // adjust viewport size as desired
      const x = Math.min(Math.max(0, svgP.x - vw/2), 2000 - vw);
      const y = Math.min(Math.max(0, svgP.y - vh/2), 1500 - vh);

      this.svg.setAttribute("viewBox", `${x} ${y} ${vw} ${vh}`);
      this.zoomLevel = 1;
    } else {
      // Zoom back out
      this.svg.setAttribute("viewBox", "0 0 2000 1500");
      this.zoomLevel = 0;
    }
    this.renderGrid();
  }

  /*–––––– WORLD GRID TOGGLE ––––––*/

  toggleGrid(event) {
    this.layoutData.grid_on = event.target.checked;
    this.renderFactoryArea();
  }

  /*–––––– AREA SELECTION ––––––*/

  startAreaSelect() {
    if (this.isSelectingArea) return;
    this.isSelectingArea = true;
    this.svg.style.cursor = "crosshair";
    this.svg.addEventListener("mousedown", this.beginDrag.bind(this));
  }

  beginDrag(event) {
    if (!this.isSelectingArea) return;

    // Convert to SVG coords
    const [x0, y0] = this.getSvgCoords(event);
    const snap = v => Math.round(v/4) * 4;
    this.startPoint = {
      x: this.layoutData.grid_on ? snap(x0) : x0,
      y: this.layoutData.grid_on ? snap(y0) : y0
    };

    // Create the selection <rect>
    this.selectionRect = document.createElementNS(this.svg.namespaceURI, "rect");
    this.selectionRect.setAttribute("x", this.startPoint.x);
    this.selectionRect.setAttribute("y", this.startPoint.y);
    this.selectionRect.setAttribute("width", 0);
    this.selectionRect.setAttribute("height", 0);
    this.selectionRect.setAttribute("fill", "rgba(34,197,94,0.3)");
    this.selectionRect.setAttribute("stroke", "#22c55e");
    this.selectionRect.setAttribute("stroke-width", "2");
    this.selectionRect.setAttribute("pointer-events", "none");
    this.svg.appendChild(this.selectionRect);

    window.addEventListener("mousemove", this.updateDrag.bind(this));
    window.addEventListener("mouseup",   this.endDrag.bind(this));
  }

  updateDrag(event) {
    if (!this.selectionRect) return;
    const [x1, y1] = this.getSvgCoords(event);
    const snap = v => Math.round(v/4) * 4;
    const x = this.layoutData.grid_on ? snap(x1) : x1;
    const y = this.layoutData.grid_on ? snap(y1) : y1;

    const xMin   = Math.min(this.startPoint.x, x);
    const yMin   = Math.min(this.startPoint.y, y);
    const width  = Math.abs(x - this.startPoint.x);
    const height = Math.abs(y - this.startPoint.y);

    this.selectionRect.setAttribute("x",       xMin);
    this.selectionRect.setAttribute("y",       yMin);
    this.selectionRect.setAttribute("width",   width);
    this.selectionRect.setAttribute("height",  height);
  }

  endDrag() {
    window.removeEventListener("mousemove", this.updateDrag);
    window.removeEventListener("mouseup",   this.endDrag);

    const x      = +this.selectionRect.getAttribute("x");
    const y      = +this.selectionRect.getAttribute("y");
    const width  = +this.selectionRect.getAttribute("width");
    const height = +this.selectionRect.getAttribute("height");

    this.layoutData.factory_area = { x, y, width, height };
    this.foundationOptionsTarget.classList.remove("hidden");

    this.isSelectingArea = false;
    this.svg.style.cursor   = "";
    this.svg.removeEventListener("mousedown", this.beginDrag);
  }

  cancelAreaSelection() {
    if (this.selectionRect) {
      this.selectionRect.remove();
      this.selectionRect = null;
    }
    this.isSelectingArea = false;
    this.svg.style.cursor = "";
    this.svg.removeEventListener("mousedown", this.beginDrag);
    window.removeEventListener("mousemove", this.updateDrag);
    window.removeEventListener("mouseup",   this.endDrag);
  }

  /*–––––– DRAW EXISTING AREA ––––––*/

  renderFactoryArea() {
    const old = this.svg.querySelector("#factory-area");
    if (old) old.remove();

    const area = this.layoutData.factory_area;
    if (!area) return;

    const rect = document.createElementNS(this.svg.namespaceURI, "rect");
    rect.setAttribute("id",     "factory-area");
    rect.setAttribute("x",      area.x);
    rect.setAttribute("y",      area.y);
    rect.setAttribute("width",  area.width);
    rect.setAttribute("height", area.height);
    rect.setAttribute("fill",   this.layoutData.foundation.material
      ? this.foundationColor(this.layoutData.foundation.material, 0.3)
      : "rgba(34,197,94,0.3)");
    rect.setAttribute("stroke", "#22c55e");
    rect.setAttribute("stroke-width", "2");
    rect.setAttribute("pointer-events", "none");
    this.svg.appendChild(rect);

    // Ensure the foundation options are visible
    if (this.foundationOptionsTarget.classList.contains("hidden")) {
      this.foundationOptionsTarget.classList.remove("hidden");
    }
  }

  foundationColor(material, alpha = 0.3) {
    switch (material) {
      case "concrete":   return `rgba(107,114,128,${alpha})`;
      case "metal":      return `rgba(156,163,175,${alpha})`;
      case "fiberglass": return `rgba(22,163,74,${alpha})`;
      default:           return `rgba(34,197,94,${alpha})`;
    }
  }

  /*–––––– FOUNDATION CHOICES ––––––*/

  chooseFoundationSize(event) {
    this.layoutData.foundation.size = parseInt(event.currentTarget.dataset.plannerSizeValue, 10);
    console.log("Foundation size:", this.layoutData.foundation.size);
    this.renderFactoryArea();
  }

  chooseMaterial(event) {
    this.layoutData.foundation.material = event.currentTarget.dataset.plannerMaterialValue;
    console.log("Foundation material:", this.layoutData.foundation.material);
    this.renderFactoryArea();
  }

  /*–––––– NODE PLACEMENT ––––––*/

  addNodeToLayout(event) {
    const node = event.detail;
    const placed = {
      node_id:       node.id,
      position:      { x: node.latitude, y: node.longitude },
      thumbnail_url: node.thumbnail_url
    };
    this.layoutData.placed_nodes.push(placed);
    this.renderNode(placed);
  }

  renderNode(placed) {
    const { x, y } = placed.position;
    const size = 24;
    const img  = document.createElementNS(this.svg.namespaceURI, "image");
    img.setAttribute("href", placed.thumbnail_url);
    img.setAttribute("x",    x - size/2);
    img.setAttribute("y",    y - size/2);
    img.setAttribute("width",  size);
    img.setAttribute("height", size);
    this.layoutLayer.appendChild(img);
  }

  /*–––––– SAVE & EXPORT ––––––*/

  saveProject() {
    fetch(`/factory_projects/${this.projectIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token":  document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ data: this.layoutData })
    })
    .then(resp => { if (!resp.ok) throw new Error("Save failed"); return resp.json(); })
    .then(() => alert("Project saved!"))
    .catch(err => {
      console.error("Save error:", err);
      alert("Error saving project: " + err.message);
    });
  }

  exportJSON() {
    const dataStr = JSON.stringify(this.layoutData, null, 2);
    const blob    = new Blob([dataStr], { type: "application/json" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href        = url;
    a.download    = `factory_project_${this.projectIdValue}_layout.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /*–––––– UTILITY ––––––*/

  getSvgCoords(evt) {
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const ctm = this.svg.getScreenCTM().inverse();
    const svgP = pt.matrixTransform(ctm);
    return [svgP.x, svgP.y];
  }
}
