class CreateFactoryProjects < ActiveRecord::Migration[7.0]
  def change
    create_table :factory_projects do |t|
      t.string :title, null: false
      t.text :description
      t.jsonb :data, default: { placed_nodes: [], buildings: [], conveyors: [], power_lines: [], balancers: [] }

      t.timestamps
    end
  end
end
