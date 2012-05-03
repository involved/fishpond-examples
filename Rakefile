require 'rake'
require 'progress_bar'

task :publish do
  puts "+----------------------------------+"
  puts "|            fishpond              |"
  puts "|       Publishing Examples        |"
  puts "+----------------------------------+"
  puts ""
  puts "Note: All changes on master will be"
  puts "      committed and pushed to origin"
  puts "      before publishing, as a safety"
  puts "      precaution."
  puts ""

  sleep 2 # bailout time.

  pb = ProgressBar.new(17, :bar, :percentage, :eta)

  %x{git add .}
  pb.increment!
  %x{git commit -am "[Automated] Pre-publish safety build"}
  pb.increment!
  %x{git push origin master}
  pb.increment!
  %x{middleman build}
  pb.increment!
  %x{git add build/*}
  pb.increment!
  %x{git commit -am "[Automated] Building pages"}
  pb.increment!
  %x{git symbolic-ref HEAD refs/heads/gh-pages}
  pb.increment!
  %x{git pull origin gh-pages}
  pb.increment!
  %x{rm .git/index}
  pb.increment!
  %x{git clean -fdx}
  pb.increment!
  %x{git checkout master /build}
  pb.increment!
  %x{mv build/* ./}
  pb.increment!
  %x{rmdir build}
  pb.increment!
  %x{git add .}
  pb.increment!
  %x{git commit -am "[Automated] Published pages"}
  pb.increment!
  %x{git push origin gh-pages}
  pb.increment!
  %x{git checkout master}
  pb.increment!
end
