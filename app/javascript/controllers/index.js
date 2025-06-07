import { Application } from "@hotwired/stimulus";
import MapController from "./map_controller";
import PaletteController from "./palette_controller";
import PlannerController from "./planner_controller";

const application = Application.start();
application.register("map", MapController);
application.register("palette", PaletteController);
application.register("planner", PlannerController);

