import { Link, useParams } from "react-router-dom";
import { Clock, ChevronRight, BookOpen, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getArticlesByCategory,
  getCategoryBySlug,
} from "@/lib/kb-articles";

const KbCategory = () => {
  const { category } = useParams<{ category: string }>();
  const cat = category ? getCategoryBySlug(category) : undefined;
  const articles = category ? getArticlesByCategory(category) : [];

  if (!cat) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1 text-xl font-bold">
              <span className="text-gray-900">MilCrunch</span>
              <span className="text-[#3b82f6] font-extrabold">X</span>
            </Link>
            <Link
              to="/kb"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Knowledge Base
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Category not found
          </h1>
          <p className="text-gray-500 mb-6">
            The category you're looking for doesn't exist.
          </p>
          <Link
            to="/kb"
            className="inline-flex items-center gap-2 text-[#1e3a5f] hover:underline font-medium text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-xl font-bold">
            <span className="text-gray-900">MilCrunch</span>
            <span className="text-[#3b82f6] font-extrabold">X</span>
          </Link>
          <Link
            to="/kb"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Knowledge Base
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/kb" className="hover:text-[#1e3a5f] transition-colors">
              Knowledge Base
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-gray-900 font-medium">{cat.label}</span>
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{cat.emoji}</span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {cat.label}
            </h1>
          </div>
          <p className="text-gray-500 mt-2 max-w-2xl">{cat.description}</p>
        </div>
      </section>

      {/* Article List */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              No articles in this category yet.
            </p>
            <Link
              to="/kb"
              className="inline-flex items-center gap-2 text-[#1e3a5f] hover:underline font-medium text-sm mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Knowledge Base
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.slug}
                to={`/kb/${category}/${article.slug}`}
                className={cn(
                  "block bg-white border border-gray-100 rounded-lg p-6",
                  "hover:shadow-md hover:border-gray-200 transition-all group"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#1e3a5f] transition-colors text-lg">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {article.readTime} min read
                      </span>
                      <span>{article.date}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#1e3a5f] transition-colors mt-1 flex-shrink-0" />
                </div>
              </Link>
            ))}
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
              className="text-[#1e3a5f] hover:underline font-medium"
            >
              Contact support
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default KbCategory;
