#!/bin/bash

CONFIG_FILE=_config.yml

# Function to manage Gemfile.lock
manage_gemfile_lock() {
    git config --global --add safe.directory '*'
    if [ -f Gemfile.lock ]; then
        echo "Removing existing Gemfile.lock to force rebuild for current architecture"
        rm -f Gemfile.lock
    fi
}

start_jekyll() {
    manage_gemfile_lock
    # Uncomment to force rebuild for current architecture
    # bundle config set --local force_ruby_platform true
    # bundle install --no-cache
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
