require 'rake'

task :publish do
  %x{middleman build}
  # push build directory into gh-pages
  # push gh-pages
  %x{rm -rf build}
end
