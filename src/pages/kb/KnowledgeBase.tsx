import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KB_CATEGORIES,
  KB_ARTICLES,
  searchArticles,
  getArticlesByCategory,
} from "@/lib/kb-articles";
import type { KbArticle } from "@/lib/kb-articles";

const KnowledgeBase = () => {
  const [query, setQuery] = useState("");

  const filteredArticles = useMemo(() => {
    if (!query.trim()) return [];
    return searchArticles(query.trim());
  }, [query]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of KB_CATEGORIES) {
      counts[cat.slug] = getArticlesByCategory(cat.slug).length;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-xl font-bold">
            <span className="text-gray-900">recurrent</span>
            <span className="text-[#6C5CE7] font-extrabold">X</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero / Search */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen className="h-6 w-6 text-[#6C5CE7]" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Knowledge Base
            </h1>
          </div>
          <p className="text-gray-500 text-lg mb-8">
            Everything you need to get the most out of RecurrentX.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7] transition shadow-sm text-base"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {query.trim() ? (
          /* Search Results */
          <div>
            <p className="text-sm text-gray-500 mb-6">
              {filteredArticles.length}{" "}
              {filteredArticles.length === 1 ? "result" : "results"} for "
              {query.trim()}"
            </p>

            {filteredArticles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">
                  No articles matched your search.
                </p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-4 text-[#6C5CE7] hover:underline text-sm"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArticles.map((article: KbArticle) => (
                  <Link
                    key={article.slug}
                    to={`/kb/${article.category}/${article.slug}`}
                    className="block bg-white border border-gray-100 rounded-lg p-5 hover:shadow-md hover:border-gray-200 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-[#6C5CE7] transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                          {article.summary}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="inline-block text-xs font-medium bg-[#6C5CE7]/10 text-[#6C5CE7] px-2 py-0.5 rounded-full">
                            {article.category}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {article.readTime} min read
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#6C5CE7] transition-colors mt-1 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Category Grid */
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Browse by Category
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {KB_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/kb/${cat.slug}`}
                  className={cn(
                    "block bg-gray-50 border border-gray-100 rounded-xl p-6",
                    "hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 transition-all group"
                  )}
                >
                  <div className="text-3xl mb-3">{cat.emoji}</div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#6C5CE7] transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-3">
                    {categoryCounts[cat.slug] ?? 0}{" "}
                    {(categoryCounts[cat.slug] ?? 0) === 1
                      ? "article"
                      : "articles"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <p className="text-gray-500 text-sm">
            Can't find what you need?{" "}
            <a
              href="mailto:support@recurrentx.com"
              className="text-[#6C5CE7] hover:underline font-medium"
            >
              Contact support
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default KnowledgeBase;
