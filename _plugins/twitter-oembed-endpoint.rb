# frozen_string_literal: true

require "jekyll-twitter-plugin"

# jekyll-twitter-plugin still calls publish.twitter.com, which now redirects to
# publish.x.com. The gem's Net::HTTP client does not follow that redirect.
TwitterJekyll.send(:remove_const, :TWITTER_API_URL)
TwitterJekyll.const_set(:TWITTER_API_URL, "https://publish.x.com/oembed".freeze)
