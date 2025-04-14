"use client";

import { useState } from "react";

export default function VerifyNewsPage() {
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSaveStatus(null);
    setLoading(true);

    try {
      // 🔍 1. Call the external verification API directly
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

      const verificationResult = await verificationRes.json();
      
      // Set the result immediately to display the full response
      setResult(verificationResult);

      // 💾 2. Save key fields to Supabase via your API route
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
          }),
        });

        if (!saveRes.ok) {
          throw new Error("Failed to save result to database");
        }
        
        setSaveStatus("Result saved successfully!");
      } catch (saveErr: any) {
        console.error("Save error:", saveErr);
        setSaveStatus("Warning: Verification completed but failed to save to database");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    }

    setLoading(false);
  };

  // Format JSON for better display
  const formatJsonOutput = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">News Verification System</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="headline" className="block text-sm font-medium text-gray-700">Headline</label>
          <input
            id="headline"
            type="text"
            placeholder="Enter news headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required
            className="mt-1 w-full border border-gray-300 p-2 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
          <textarea
            id="content"
            placeholder="Enter news content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="mt-1 w-full border border-gray-300 p-2 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
          />
        </div>
        
        <div>
          <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700">Source URL (optional)</label>
          <input
            id="sourceUrl"
            type="url"
            placeholder="https://example.com/news-article"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="mt-1 w-full border border-gray-300 p-2 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {loading ? "Verifying..." : "Verify News"}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded shadow text-red-700">
          <h2 className="font-semibold">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {saveStatus && (
        <div className={`mt-4 p-3 rounded ${saveStatus.includes("Warning") ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
          {saveStatus}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          {/* Summary Card */}
          <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
            <h2 className="text-xl font-bold mb-4">Verification Result</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Verdict</h3>
                <p className={`text-lg font-bold ${
                  result.verdict === "Verified" ? "text-green-600" : 
                  result.verdict === "Likely Fake" ? "text-red-600" : "text-yellow-600"
                }`}>
                  {result.verdict}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700">Credibility Score</h3>
                <p className="text-lg font-bold">
                  {result.verification_data?.source_confidence || "N/A"}/100
                </p>
              </div>
            </div>
            
            {/* Status Message */}
            <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 whitespace-pre-line">
              {result.status_message}
            </div>
          </div>
          
          {/* Analysis Card */}
          {result.llm_response && (
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
              <h2 className="text-xl font-bold mb-4">AI Analysis</h2>
              <div className="prose max-w-none bg-gray-50 p-4 rounded whitespace-pre-line">
                {result.llm_response}
              </div>
            </div>
          )}
          
          {/* Technical Details Card */}
          <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
            <h2 className="text-xl font-bold mb-4">Verification Details</h2>
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-sm">{formatJsonOutput(result.verification_data)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}