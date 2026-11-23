# frozen_string_literal: true

require "fileutils"

# Publishes an AI-readable Markdown twin of every post and project, plus
# /llms-full.txt (all of them in one file).
#
# AI crawlers read clean Markdown far more reliably than themed HTML, so each
# page also gets `page.markdown_url`, which _includes/ai_discovery.liquid turns
# into a <link rel="alternate" type="text/markdown"> tag.
#
# Liquid tags in the source (figures, tweets, videos) are rewritten into plain
# Markdown links; anything else in {% %} is dropped.

module AiMarkdown
  SKIP_CATEGORIES = %w[unpublished].freeze

  module_function

  def markdown_url(url)
    if url.end_with?("/")
      "#{url}index.md"
    elsif url.end_with?(".html")
      url.sub(/\.html\z/, ".md")
    else
      "#{url}.md"
    end
  end

  def attr(tag, name)
    tag[/#{name}\s*=\s*"([^"]*)"/m, 1] || tag[/#{name}\s*=\s*'([^']*)'/m, 1]
  end

  def absolute(site, link)
    return link if link.nil? || link =~ %r{\Ahttps?://}
    "#{site.config['url']}#{site.baseurl}/#{link.sub(%r{\A/}, '')}"
  end

  def clean(site, body)
    text = body.dup
    text.gsub!(/\{%\s*include\s+figure\.liquid(.*?)%\}/m) do
      tag = Regexp.last_match(1)
      path = attr(tag, "path")
      alt = attr(tag, "alt") || attr(tag, "caption") || "image"
      path ? "![#{alt}](#{absolute(site, path)})" : ""
    end
    text.gsub!(/\{%\s*include\s+video\.liquid(.*?)%\}/m) do
      tag = Regexp.last_match(1)
      path = attr(tag, "path")
      title = attr(tag, "title") || "Video"
      path ? "[Video: #{title}](#{path.sub('youtube.com/embed/', 'youtube.com/watch?v=')})" : ""
    end
    text.gsub!(/\{%\s*twitter\s+(\S+)\s*%\}/) { "[Post on X](#{Regexp.last_match(1)})" }
    # Keep site links written as {{ '/path/' | relative_url }} instead of
    # stripping them to an empty "()" target.
    text.gsub!(/\{\{-?\s*["']([^"']+)["']\s*\|\s*(?:relative|absolute)_url\s*-?\}\}/) do
      absolute(site, Regexp.last_match(1))
    end
    text.gsub!(/\{%-?\s*raw\s*-?%\}|\{%-?\s*endraw\s*-?%\}/, "")
    text.gsub!(/\{%.*?%\}/m, "")
    text.gsub!(/\{\{.*?\}\}/m, "")
    text.gsub!(%r{</?(div|span|figure|section|center)\b[^>]*>}i, "")
    text.gsub!(/^[ \t]+(!\[)/, '\\1')
    text.gsub!(/<script\b.*?<\/script>/mi, "")
    text.gsub!(/<style\b.*?<\/style>/mi, "")
    text.gsub!(/\n{3,}/, "\n\n")
    text.strip
  end

  def eligible?(doc)
    return false if doc.data["published"] == false
    return false if SKIP_CATEGORIES.include?(doc.data["category"].to_s)
    true
  end

  def kind(doc)
    doc.collection.label == "posts" ? "Essay" : "Project"
  end

  def render_doc(site, doc, source)
    page_url = absolute(site, doc.data["redirect"] || doc.url)
    lines = []
    lines << "# #{doc.data['title']}"
    lines << ""
    lines << "> #{doc.data['description']}" unless doc.data["description"].to_s.strip.empty?
    lines << "" unless doc.data["description"].to_s.strip.empty?
    meta = ["Author: Ara Khan (Arafat Khan, @arafatkatze)", "Type: #{kind(doc)}"]
    meta << "Date: #{doc.date.strftime('%Y-%m-%d')}" if doc.collection.label == "posts"
    meta << "Tags: #{Array(doc.data['tags']).join(', ')}" unless Array(doc.data["tags"]).empty?
    meta << "Category: #{doc.data['category']}" if doc.data["category"]
    meta << "Canonical page: #{page_url}"
    lines.concat(meta.map { |m| "- #{m}" })
    lines << ""
    body = clean(site, source)
    if body.empty?
      lines << "This is an interactive page; open it in a browser: #{page_url}"
    else
      lines << body
    end
    lines << ""
    lines << "---"
    lines << "More about the author: #{absolute(site, '/ai.md')}"
    lines.join("\n") + "\n"
  end

  def docs(site)
    projects = site.collections["projects"]&.docs || []
    posts = site.posts.docs
    (projects + posts).select { |d| eligible?(d) }
  end
end

# Capture the raw Markdown before Jekyll renders it, then write the twins
# straight into _site after the build so nothing converts or minifies them.
Jekyll::Hooks.register :site, :post_read do |site|
  site.config["ai_markdown_raw"] = {}
  AiMarkdown.docs(site).each do |doc|
    doc.data["markdown_url"] = AiMarkdown.markdown_url(doc.url)
    site.config["ai_markdown_raw"][doc.url] = doc.content.to_s.dup
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  raw = site.config["ai_markdown_raw"] || {}
  docs = AiMarkdown.docs(site)
  full = []
  full << "# Ara Khan: full text of essays and project write-ups"
  full << ""
  full << "Source: #{site.config['url']}. Profile: #{site.config['url']}/ai.md. Index: #{site.config['url']}/llms.txt"
  full << ""

  work, rest = docs.partition { |d| d.data["category"] == "work" }
  ordered = work.sort_by { |d| d.data["importance"] || 99 } +
            rest.sort_by { |d| d.collection.label == "posts" ? -d.date.to_i : 0 }
  ordered.each do |doc|
    md = AiMarkdown.render_doc(site, doc, raw[doc.url] || "")
    out = File.join(site.dest, doc.data["markdown_url"])
    FileUtils.mkdir_p(File.dirname(out))
    File.write(out, md)
    full << md
    full << ""
  end
  File.write(File.join(site.dest, "llms-full.txt"), full.join("\n"))
end
