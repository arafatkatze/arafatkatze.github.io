#!/bin/bash
set -euo pipefail

echo "Entry point script running"

CONFIG_FILE=_config.yml

# Function to manage Gemfile.lock
manage_gemfile_lock() {
    git config --global --add safe.directory '*'
    
    # Remove the Gemfile.lock to regenerate it for the current architecture
    if [ -f Gemfile.lock ]; then
        echo "Removing Gemfile.lock to regenerate it for the current architecture"
        rm -f Gemfile.lock
    fi
    
    # Run bundle install with the correct platform
    echo "Running bundle install to generate a new Gemfile.lock"
    bundle config set --local path vendor/bundle
    bundle config set --local build.nokogiri --use-system-libraries
    bundle install
}

start_jekyll() {
    manage_gemfile_lock
    bundle exec jekyll serve --watch --port=8080 --host=0.0.0.0 --livereload --verbose --trace --force_polling &
}

start_jekyll

while true; do
    inotifywait -q -e modify,move,create,delete $CONFIG_FILE
    if [ $? -eq 0 ]; then
        echo "Change detected to $CONFIG_FILE, restarting Jekyll"
        jekyll_pid=$(pgrep -f jekyll)
        kill -KILL $jekyll_pid
        start_jekyll
    fi
done
