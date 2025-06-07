# frozen_string_literal: true

class NavigationComponent < ViewComponent::Base
  def initialize(nav:)
    @nav = nav
  end
end
