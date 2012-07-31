###
# Page command
###
page "/demos/*", :layout => "demo_layout" do
  @demos = Dir[File.expand_path('../source/demos/*/', __FILE__)].map{ |d| File.basename(d) }
  @lab_demos = Dir[File.expand_path('../source/lab/demos/*/', __FILE__)].map{ |d| File.basename(d) }
end

page "/lab/demos/*", :layout => "demo_layout" do
  @demos = Dir[File.expand_path('../source/demos/*/', __FILE__)].map{ |d| File.basename(d) }
  @lab_demos = Dir[File.expand_path('../source/lab/demos/*/', __FILE__)].map{ |d| File.basename(d) }
end

page "/*" do
  @demos = Dir[File.expand_path('../source/demos/*/', __FILE__)].map{ |d| File.basename(d) }
  @lab_demos = Dir[File.expand_path('../source/lab/demos/*/', __FILE__)].map{ |d| File.basename(d) }
end



# Per-page layout changes:
# 
# With no layout
# page "/path/to/file.html", :layout => false
# 
# With alternative layout
# page "/path/to/file.html", :layout => :otherlayout
# 
# A path which all have the same layout
# with_layout :admin do
#   page "/admin/*"
# end

# Proxy (fake) files
# page "/this-page-has-no-template.html", :proxy => "/template-file.html" do
#   @which_fake_page = "Rendering a fake page with a variable"
# end

###
# Helpers
###

helpers do
  def demo_path(demo_name)
    "/demos/#{demo_name}"
  end

  def lab_demo_path(demo_name)
    "/lab/demos/#{demo_name}"
  end

  def title(page_title, page_subtitle = nil)
    content_for(:title) { page_title }
  end 

  def body_class(body_class)
    content_for(:body_class){ body_class }
  end

  def root_path
    "/"
  end

  def static_api_key(boolean)
    content_for(:static_api_key){ boolean }
  end

  def api_hardcoded?
    return true if content_for?(:static_api_key) == true
  end

  def root_path
    "/"
  end

end

module Haml::Filters
  module Scss
    include Base
    lazy_require 'sass/plugin'

    def render(text)
      ::Sass::Engine.new(text, ::Sass::Plugin.engine_options.merge(:syntax => :scss)).render
    end
  end
end

###
# Config
###

# Nothing, yet.


# Build-specific configuration
configure :build do
  # For example, change the Compass output style for deployment
  # activate :minify_css
  
  # Minify Javascript on build
  # activate :minify_javascript
  
  # Enable cache buster
  # activate :cache_buster
  
  # Use relative URLs
  # activate :relative_assets
  
  # Compress PNGs after build
  # First: gem install middleman-smusher
  # require "middleman-smusher"
  # activate :smusher
  
  # Or use a different image path
  # set :http_path, "/Content/images/"
  #
  helpers do
    def link_to(label, link, options = {})
      if link =~ /^http/ || link =~ /^{{/
        super(label, link, options)
      else
        super(label, File.join("/fishpond-examples", link), options)
      end
    end

    def asset_url(path, prefix = nil)
      File.join "/fishdpond-examples", super(path, prefix)
    end

    def root_path
      "/fishpond-examples/"
    end
    
  end
end
