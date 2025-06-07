# frozen_string_literal: true

class MapComponent < ViewComponent::Base
  def initialize(width:, height:, background_url:)
    @width = width
    @height = height
    @background_url = background_url
  end
end
