require 'rake'

task :publish do
  %x{middleman build}
  %x{g checkout gh-pages}

  Dir["./"].each do |f|
    puts f
  end

  # push build directory into gh-pages
  # push gh-pages

  #%x{rm -rf build}
end
