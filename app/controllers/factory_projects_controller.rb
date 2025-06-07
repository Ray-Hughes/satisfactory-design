class FactoryProjectsController < ApplicationController
  before_action :set_project, only: [ :show, :edit, :update ]

  # GET /factory_projects
  def index
    @projects = FactoryProject.all.order(created_at: :desc)
  end

  # GET /factory_projects/new
  def new
    @project = FactoryProject.new
  end

  # POST /factory_projects
  def create
    @project = FactoryProject.new(project_params.merge(data: default_layout))

    if @project.save
      redirect_to edit_factory_project_path(@project), notice: "Project created—start planning!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  # GET /factory_projects/:id/edit
  def edit
    # Renders the planner canvas (we’ll add that in the view)
  end

  # PATCH /factory_projects/:id
  def update
    # Expecting `params[:data]` to be a JSON object
    if @project.update(data: params.require(:data))
      render json: { status: "ok" }
    else
      render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # GET /factory_projects/:id
  def show
    # Optional read-only view
  end

  private

  def set_project
    @project = FactoryProject.find(params[:id])
  end

  def project_params
    params.require(:factory_project).permit(:title, :description)
  end

  def default_layout
    {
      placed_nodes: [],
      buildings: [],
      conveyors: [],
      power_lines: [],
      balancers: []
    }
  end
end
