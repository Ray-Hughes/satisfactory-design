// app/javascript/controllers/palette_controller.js
import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = {
    tool: String
  };

  connect() {
    this.selectedTool = null;
  }

  selectTool(event) {
    this.selectedTool = event.currentTarget.dataset.paletteToolValue;
    console.log("Tool selected:", this.selectedTool);

    // Dispatch a custom event so planner_controller can react if needed
    const customEvent = new CustomEvent("tool:changed", {
      detail: { tool: this.selectedTool },
      bubbles: true
    });
    this.element.dispatchEvent(customEvent);
  }
}
