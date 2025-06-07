ResourceNode.delete_all

# Create a handful of example nodes
ResourceNode.create!([
  {
    name:          "Iron Deposit Alpha",
    resource_type: "iron_ore",
    latitude:      400,       # X-coordinate on your 2000×1500 map
    longitude:     300,       # Y-coordinate on your 2000×1500 map
    thumbnail_url: ActionController::Base.helpers.asset_path("icons/iron.png")
  },
  {
    name:          "Copper Deposit Beta",
    resource_type: "copper_ore",
    latitude:      1200,
    longitude:     500,
    thumbnail_url: ActionController::Base.helpers.asset_path("icons/copper.png")
  },
  {
    name:          "Limestone Quarry",
    resource_type: "limestone",
    latitude:      800,
    longitude:     900,
    thumbnail_url: ActionController::Base.helpers.asset_path("icons/limestone.png")
  }
])
