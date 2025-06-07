# app/components/factory_planner_component.rb
class FactoryPlannerComponent < ViewComponent::Base
  def initialize(project:)
    @project = project
  end
end
