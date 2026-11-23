# based on https://distresssignal.org/busting-css-cache-with-jekyll-md5-hash
# https://gist.github.com/BryanSchuetz/2ee8c115096d7dd98f294362f6a667db
module Jekyll
  module CacheBust
    class CacheDigester
      require 'digest/md5'
      require 'pathname'

      attr_accessor :file_name, :directory

      def initialize(file_name:, directory: nil)
        self.file_name = file_name
        self.directory = directory
      end

      def digest!
        [file_name, '?', Digest::MD5.hexdigest(file_contents)].join
      end

      private

      def directory_files_content
        target_path = File.join(directory, '**', '*')
        Dir[target_path].map{|f| File.read(f) unless File.directory?(f) }.join
      end

      def file_content
        local_file_name = file_name.slice((file_name.index('assets/')..-1))
        File.read(local_file_name)
      end

      def file_contents
        is_directory? ? file_content : directory_files_content
      end

      def is_directory?
        directory.nil?
      end
    end

    # One value per build. The deploy runs purgecss over every stylesheet, so a
    # deployed .css file depends on the whole site's HTML, not just on its own
    # source. A source-only digest therefore stays the same while the deployed
    # file changes, and CDNs keep serving the previous one. Stylesheets get
    # this build stamp in their key so each deploy has its own URLs.
    BUILD_STAMP = Time.now.to_i.to_s(36)

    def bust_file_cache(file_name)
      digested = CacheDigester.new(file_name: file_name, directory: nil).digest!
      file_name.to_s.end_with?('.css') ? "#{digested}-#{BUILD_STAMP}" : digested
    end

    # The stylesheet is compiled from _sass/, so its cache key is a digest of
    # those sources and main.scss. (This used to point at assets/_sass, which does not exist,
    # so every deploy produced the same key and CDNs kept serving stale CSS.)
    def bust_css_cache(file_name)
      sources = Dir[File.join('_sass', '**', '*')].sort.reject { |f| File.directory?(f) }
      sources << File.join('assets', 'css', 'main.scss')
      digest = Digest::MD5.hexdigest(sources.map { |f| File.read(f) }.join)
      [file_name, '?', digest, '-', BUILD_STAMP].join
    end
  end
end

Liquid::Template.register_filter(Jekyll::CacheBust)