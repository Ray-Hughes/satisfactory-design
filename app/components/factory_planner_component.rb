# app/components/factory_planner_component.rb
class FactoryPlannerComponent < ViewComponent::Base
  def initialize(project:, background_url:)
    @project        = project
    @background_url = background_url
  end
end
