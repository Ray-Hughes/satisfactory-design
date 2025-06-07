# frozen_string_literal: true

class NodeMarkerComponent < ViewComponent::Base
  def initialize(x:, y:, icon_url:)
    @x = x
    @y = y
    @icon_url = icon_url
  end
end
