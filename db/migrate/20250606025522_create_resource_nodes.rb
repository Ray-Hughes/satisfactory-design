class CreateResourceNodes < ActiveRecord::Migration[8.0]
  def change
    create_table :resource_nodes do |t|
      t.string :name
      t.string :resource_type
      t.float :latitude
      t.float :longitude
      t.string :thumbnail_url

      t.timestamps
    end
  end
end
