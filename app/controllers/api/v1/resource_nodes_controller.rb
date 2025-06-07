module Api
  module V1
    class ResourceNodesController < ApplicationController
      # If you want this to be public, you can skip authentication; otherwise add before_action :authenticate_user!
      def index
        nodes = ResourceNode.select(:id, :name, :resource_type, :latitude, :longitude, :thumbnail_url)
        render json: nodes
      end

      def show
        node = ResourceNode.find(params[:id])
        render json: node
      end
    end
  end
end
