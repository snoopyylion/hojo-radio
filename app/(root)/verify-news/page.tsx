"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

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
        throw new Error(`Verification failed: ${await verificationRes.text()}`);
      }

      const verificationResult: VerificationResult = await verificationRes.json();
      setResult(verificationResult);

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

      setSaveStatus("✅ Result saved successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong");
      setSaveStatus("⚠️ Verification completed but failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pt-[140px]">
      <h1 className="text-3xl font-bold text-center mb-8">🧠 AI-Powered News Verifier</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-5">
        <div>
          <label htmlFor="headline" className="block text-sm font-semibold mb-1">Headline</label>
          <input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter news headline"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-semibold mb-1">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
            placeholder="Enter the full article content..."
          />
        </div>

        <div>
          <label htmlFor="sourceUrl" className="block text-sm font-semibold mb-1">Source URL (optional)</label>
          <input
            id="sourceUrl"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="https://example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify News"}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-800 rounded-lg shadow-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {saveStatus && (
        <div className={`mt-4 p-3 rounded-lg shadow-sm ${saveStatus.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
          {saveStatus}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">✅ Verification Result</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Verdict:</p>
                <p className={`text-lg font-bold ${result.verdict === "Verified" ? "text-green-600" : result.verdict === "Likely Fake" ? "text-red-600" : "text-yellow-600"}`}>
                  {result.verdict}
                </p>
              </div>
              <div>
                <p className="font-medium">Credibility Score:</p>
                <p className="text-lg font-bold">{result.verification_data?.source_confidence || "N/A"}/100</p>
              </div>
            </div>
            {result.status_message && (
              <div className="mt-4 bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                {result.status_message}
              </div>
            )}
          </div>

          {result.llm_response && (
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-semibold mb-4">🧾 AI Analysis</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
                {result.llm_response}
              </pre>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">📊 Full Verification Details</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm max-h-[400px] overflow-auto">
              {JSON.stringify(result.verification_data ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
