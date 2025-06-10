import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = {
    projectId: Number,
    projectData: String
  };
  static targets = ["gridLayer", "foundationOptions", "areaButtonLabel"];

  connect() {
    console.log("🔧 planner controller connected");
    // 1) Parse or default the layoutData
    try {
      this.layoutData = JSON.parse(this.projectDataValue || "{}");
    } catch {
      this.layoutData = {};
    }
    this.layoutData.placed_nodes   ||= [];
    this.layoutData.buildings      ||= [];
    this.layoutData.conveyors      ||= [];
    this.layoutData.power_lines    ||= [];
    this.layoutData.balancers      ||= [];
    this.layoutData.factory_area   ||= null;
    this.layoutData.grid_on        = this.layoutData.grid_on ?? true;
    this.layoutData.foundation     ||= {};

    // 2) Cache SVG & layers
    this.svg         = this.element.querySelector("#factory-canvas");
    this.gridLayer   = this.gridLayerTarget;
    this.layoutLayer = this.svg.querySelector("#layout-layer");

    // 3) Zoom / grid setup
    this.zoomLevel     = 0;    // 0 = world, 1 = detail
    this.baseSpacing   = 50;   // coarse grid spacing at world zoom
    this.detailSpacing = 4;    // fine grid at detail zoom

    // 4) Initial render
    this.renderGrid();
    this.renderFactoryArea();

    this.areaButtonLabelTarget = this.areaButtonLabelTarget; // auto-wired by Stimulus
    window.addEventListener("keydown", this.onKeyDownBound = this.onKeyDown.bind(this));

    // 5) Bind global events
    this.svg.addEventListener("click", this.onCanvasClick.bind(this));
    window.addEventListener("node:clicked", this.addNodeToLayout.bind(this));

    // 6) Area‐selection state
    this.isSelectingArea = false;
    this.selectionRect   = null;
    this.startPoint      = null;
  }

  disconnect() {
    this.svg.removeEventListener("click", this.onCanvasClick);
    window.removeEventListener("node:clicked", this.addNodeToLayout);
    this.cancelAreaSelection();
  }

  /*–––––– GRID & ZOOM ––––––*/
  renderGrid() {
    this.gridLayer.innerHTML = "";
    const spacing = this.zoomLevel === 0 ? this.baseSpacing : this.detailSpacing;

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
    // Only zoom in from world level; further clicks do nothing
    if (this.zoomLevel !== 0 || this.isSelectingArea) return;

    const pt = this.svg.createSVGPoint();
    pt.x = event.clientX; pt.y = event.clientY;
    const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());

    // Zoom box size (tweak as desired)
    const vw = 400, vh = 300;
    const x = Math.min(Math.max(0, svgP.x - vw/2), 2000 - vw);
    const y = Math.min(Math.max(0, svgP.y - vh/2), 1500 - vh);

    this.svg.setAttribute("viewBox", `${x} ${y} ${vw} ${vh}`);
    this.zoomLevel = 1;
    this.renderGrid();
  }

  /*–––––– TOGGLE GRID ––––––*/
  toggleGrid(event) {
    this.layoutData.grid_on = event.target.checked;
    this.renderFactoryArea();
  }

  /*–––––– AREA SELECTION ––––––*/
  toggleAreaSelect() {
    this.isSelectingArea = !this.isSelectingArea;
    this.svg.style.cursor = this.isSelectingArea ? "crosshair" : "";
    this.areaButtonLabelTarget.textContent =
      this.isSelectingArea ? "Cancel Area Selection" : "Select Factory Area";

    if (!this.isSelectingArea) {
      this.cancelAreaSelection();
    }
  }

  // Abort on Escape
  onKeyDown(event) {
    if (event.key === "Escape" && this.isSelectingArea) {
      this.toggleAreaSelect();  // this will call cancelAreaSelection()
    }
  }

  beginDrag(event) {
    console.log("🖱️ beginDrag at", event.clientX, event.clientY);

    // compute SVG coords:
    const [x0, y0] = this.getSvgCoords(event);
    console.log("   → svg coords:", x0, y0);

    // … create selectionRect …
    window.addEventListener("mousemove", this.updateDragBound = this.updateDrag.bind(this));
    window.addEventListener("mouseup",   this.endDragBound   = this.endDrag.bind(this));
  }

  updateDrag(event) {
    const [x1, y1] = this.getSvgCoords(event);
    console.log("   dragging to", x1, y1);
    // … rest of update logic …
  }

  endDrag(event) {
    window.removeEventListener("mousemove", this.updateDragBound);
    window.removeEventListener("mouseup",   this.endDragBound);
    this.isSelectingArea = false;
    this.svg.style.cursor = "";
    this.areaButtonLabelTarget.textContent = "Select Factory Area";
  }


  cancelAreaSelection() {
    if (this.selectionRect) {
      this.selectionRect.remove();
      this.selectionRect = null;
    }
    this.isSelectingArea = false;
    this.svg.style.cursor = "";
    window.removeEventListener("mousemove", this.updateDrag);
    window.removeEventListener("mouseup",   this.endDrag);
  }

  /*–––––– RENDER EXISTING AREA ––––––*/
  renderFactoryArea() {
    const old = this.svg.querySelector("#factory-area");
    if (old) old.remove();

    const area = this.layoutData.factory_area;
    if (!area) return;

    const rect = document.createElementNS(this.svg.namespaceURI, "rect");
    rect.setAttribute("id", "factory-area");
    rect.setAttribute("x",  area.x);
    rect.setAttribute("y",  area.y);
    rect.setAttribute("width",  area.width);
    rect.setAttribute("height", area.height);
    rect.setAttribute(
      "fill",
      this.layoutData.foundation.material
        ? this.foundationColor(this.layoutData.foundation.material, 0.3)
        : "rgba(34,197,94,0.3)"
    );
    rect.setAttribute("stroke", "#22c55e");
    rect.setAttribute("stroke-width", 2);
    rect.setAttribute("pointer-events", "none");
    this.svg.appendChild(rect);

    this.foundationOptionsTarget.classList.remove("hidden");
  }

  foundationColor(material, alpha = 0.3) {
    switch (material) {
      case "concrete":   return `rgba(107,114,128,${alpha})`;
      case "metal":      return `rgba(156,163,175,${alpha})`;
      case "fiberglass": return `rgba(22,163,74,${alpha})`;
      default:           return `rgba(34,197,94,${alpha})`;
    }
  }

  /*–––––– NODE PLACEMENT ––––––*/
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
    const size = 24;
    const img  = document.createElementNS(this.svg.namespaceURI, "image");
    img.setAttribute("href", placed.thumbnail_url);
    img.setAttribute("x",    placed.position.x - size/2);
    img.setAttribute("y",    placed.position.y - size/2);
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
      .then(r => r.ok ? r.json() : Promise.reject("Save failed"))
      .then(() => alert("Project saved!"))
      .catch(e => alert("Error saving: " + e));
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

  /*–––––– UTILITIES ––––––*/
  getSvgCoords(evt) {
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());
    return [svgP.x, svgP.y];
  }
}
