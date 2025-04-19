"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute"; // make sure this exists and is correctly imported

type VerificationData = {
  source_confidence?: number;
  ai_confidence_level?: string;
  matched_sources?: string[];
  [key: string]: unknown;
};

type VerificationResult = {
  verdict: string;
  verification_data?: VerificationData;
  llm_response?: string;
  status_message?: string;
};

export default function VerifyNewsPage() {
  return (
    <ProtectedRoute>
      <InnerVerifyNewsPage />
    </ProtectedRoute>
  );
}

function InnerVerifyNewsPage() {
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSaveStatus(null);
    setLoading(true);

    try {
      const verificationRes = await fetch(
        `${process.env.NEXT_PUBLIC_VERIFICATION_API}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headline, content, source_url: sourceUrl }),
        }
      );

      if (!verificationRes.ok) {
        const errorText = await verificationRes.text();
        throw new Error(`Verification failed: ${errorText}`);
      }

      const verificationResult: VerificationResult = await verificationRes.json();
      setResult(verificationResult);

      try {
        const saveRes = await fetch("/api/news-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headline,
            content,
            source_url: sourceUrl,
            verdict: verificationResult.verdict,
            credibility_score: verificationResult.verification_data?.source_confidence || 0,
            confidence_level: verificationResult.verification_data?.ai_confidence_level || "N/A",
            matched_sources: verificationResult.verification_data?.matched_sources || [],
          }),
        });

        if (!saveRes.ok) {
          throw new Error("Failed to save result to database");
        }

        setSaveStatus("Result saved successfully!");
      } catch (saveErr: unknown) {
        console.error("Save error:", saveErr);
        if (saveErr instanceof Error) {
          setSaveStatus(`Warning: ${saveErr.message}`);
        } else {
          setSaveStatus(
            "Warning: Verification completed but failed to save to database"
          );
        }
      }
      
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Something went wrong");
      } else {
        setError("Something went wrong");
      }
    }

    setLoading(false);
  };

  return (
    <section className="px-4 pt-[150px] md:px-8 lg:px-16 py-8 bg-white dark:bg-black transition-colors duration-300 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">🧠 AI-Powered News Verifier</h1>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-5 border border-gray-100 dark:border-gray-700 transition-colors">
          <div>
            <label htmlFor="headline" className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Headline</label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              placeholder="Enter news headline"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors min-h-[120px]"
              placeholder="Enter the full article content..."
            />
          </div>

          <div>
            <label htmlFor="sourceUrl" className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Source URL (optional)</label>
            <input
              id="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              placeholder="https://example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-60"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </div>
            ) : "Verify News"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg shadow-sm border border-red-200 dark:border-red-800 transition-colors">
            <strong>Error:</strong> {error}
          </div>
        )}

        {saveStatus && (
          <div className={`mt-4 p-3 rounded-lg shadow-sm transition-colors ${
            saveStatus.startsWith("✅") 
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800" 
              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
          }`}>
            {saveStatus}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700 transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">✅ Verification Result</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Verdict:</p>
                  <p className={`text-lg font-bold ${
                    result.verdict === "Verified" 
                      ? "text-green-600 dark:text-green-400" 
                      : result.verdict === "Likely Fake" 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}>
                    {result.verdict}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Credibility Score:</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {result.verification_data?.source_confidence || "N/A"}/100
                  </p>
                </div>
              </div>
              {result.status_message && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded border border-gray-200 dark:border-gray-600 text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200 transition-colors">
                  {result.status_message}
                </div>
              )}
            </div>

            {result.llm_response && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700 transition-colors">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">🧾 AI Analysis</h2>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition-colors">
                  {result.llm_response}
                </pre>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700 transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📊 Full Verification Details</h2>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm max-h-[400px] overflow-auto text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition-colors">
                {JSON.stringify(result.verification_data ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}