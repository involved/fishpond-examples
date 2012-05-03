require 'rake'
require 'progress_bar'
require 'open3'


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

  commands = []
  commands << 'git add .'
  commands << 'git commit -am "[Automated] Pre-publish safety build"'
  commands << 'git push origin master'
  commands << 'middleman build'
  commands << 'git add build/*'
  commands << 'git commit -am "[Automated] Building pages"'
  commands << 'git symbolic-ref HEAD refs/heads/gh-pages'
  commands << 'git pull origin gh-pages'
  commands << 'rm .git/index'
  commands << 'git clean -fdx'
  commands << 'git checkout master /build'
  commands << 'mv build/* ./'
  commands << 'rmdir build'
  commands << 'git add .'
  commands << 'git commit -am "[Automated] Published pages"'
  commands << 'git push origin gh-pages'
  commands << 'git checkout master'

  pb = ProgressBar.new(commands.count, :bar, :percentage, :eta)

  commands.each do |command|
    puts command
    stdin, stdout, stderr = Open3.popen3(command)
    pb.increment!
  end
end
