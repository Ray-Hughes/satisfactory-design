Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :resource_nodes, only: [ :index, :show ]
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check

  resources :factory_projects, only: [ :index, :new, :create, :edit, :update, :show ]
  root to: "factory_projects#index"
end
