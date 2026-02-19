import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ReportData {
  id: string;
  event_id: string;
  report_type: "gtm" | "summary";
  event_title: string;
  event_date_range: string;
  content: string;
  created_at: string;
  expires_at: string;
}

/* Simple markdown renderer (mirrors the one in EventGTMPlannerTab) */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 mb-3 text-[15px] text-gray-700 leading-relaxed">
          {listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />)}
        </ul>
      );
      listItems = [];
    }
  };

  const inlineFmt = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.+?)\*/g, "<em>$1</em>")
     .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:13px">$1</code>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = (line.match(/^#+/) || [""])[0].length;
      const text = line.replace(/^#+\s*/, "");
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      const cls = level === 1
        ? "text-xl font-bold mt-8 mb-3 text-gray-900"
        : level === 2
        ? "text-lg font-semibold mt-6 mb-2 text-gray-800"
        : "text-base font-semibold mt-4 mb-2 text-gray-700";
      elements.push(<Tag key={i} className={cls} dangerouslySetInnerHTML={{ __html: inlineFmt(text) }} />);
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(line.replace(/^[-*]\s*/, ""));
    } else if (/^\d+\.\s/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s*/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="text-[15px] text-gray-700 mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />
      );
    }
  }
  flushList();
  return elements;
}

export default function SharedReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    fetch(`/api/shared-reports?id=${reportId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Report not found or has expired.");
        return r.json();
      })
      .then((data) => setReport(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔗</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Report Unavailable</h1>
          <p className="text-gray-500 text-sm">
            {error || "This shared report was not found or has expired. Shared reports are available for 30 days."}
          </p>
          <a href="https://milcrunch.com" className="inline-block mt-6 text-[#6C5CE7] text-sm font-medium hover:underline">
            Visit MilCrunch →
          </a>
        </div>
      </div>
    );
  }

  const typeLabel = report.report_type === "gtm" ? "Go-To-Market Strategy" : "Executive Summary";
  const createdDate = new Date(report.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            MilCrunch<span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
          <span className="text-xs text-gray-400">{typeLabel}</span>
        </div>
      </header>

      {/* Title bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{report.event_title || "Event Report"}</h1>
          <p className="text-sm text-gray-500">
            {report.event_date_range && <>{report.event_date_range} · </>}
            Generated {createdDate}
          </p>
          {/* Purple accent bar */}
          <div className="mt-4 h-1 w-16 rounded-full bg-[#6C5CE7]" />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          {renderMarkdown(report.content)}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-gray-400">
            Generated by{" "}
            <a href="https://milcrunch.com" className="text-[#6C5CE7] hover:underline font-medium">
              MilCrunchX
            </a>{" "}
            — milcrunch.com
          </p>
          <p className="text-[10px] text-gray-300 mt-1">
            This report expires {new Date(report.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </footer>
    </div>
  );
}
