"use client";

import React, { useState } from "react";

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

  const getVerdictColor = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case "verified":
        return "text-green-600 dark:text-green-400";
      case "likely fake":
      case "fake":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-yellow-600 dark:text-yellow-400";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="w-full min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Hero Section */}
      <section className="w-full py-16 pt-[150px] bg-white dark:bg-black transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-32">
          <div className="text-center mb-12">
            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-snug text-gray-900 dark:text-white transition-colors">
              <span className="text-[#EF3866]">AI-Powered</span> News <br className="hidden sm:block" />
              Verification
            </h1>
            <p className="font-sora text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-[800px] mx-auto transition-colors">
              Submit any news article for instant AI-powered fact-checking and credibility analysis. 
              Get detailed insights, source verification, and confidence scores in seconds.
            </p>
          </div>

          {/* Verification Form */}
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSubmit} 
              className="bg-white dark:bg-black p-6 sm:p-8 lg:p-10 transition-colors duration-300 mb-8"
            >
              <div className="space-y-6">
                <div>
                  <label 
                    htmlFor="headline" 
                    className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white font-sora"
                  >
                    News Headline
                  </label>
                  <input
                    id="headline"
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-[#EF3866]/20 focus:border-[#EF3866] outline-none bg-white dark:bg-black text-gray-900 dark:text-white transition-all duration-300 font-sora text-sm sm:text-base"
                    placeholder="Enter the news headline you want to verify..."
                  />
                </div>

                <div>
                  <label 
                    htmlFor="content" 
                    className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white font-sora"
                  >
                    Article Content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-[#EF3866]/20 focus:border-[#EF3866] outline-none bg-white dark:bg-black text-gray-900 dark:text-white transition-all duration-300 min-h-[150px] sm:min-h-[200px] font-sora text-sm sm:text-base resize-vertical"
                    placeholder="Paste the full article content here for comprehensive analysis..."
                  />
                </div>

                <div>
                  <label 
                    htmlFor="sourceUrl" 
                    className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white font-sora"
                  >
                    Source URL <span className="text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="sourceUrl"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-[#EF3866]/20 focus:border-[#EF3866] outline-none bg-white dark:bg-black text-gray-900 dark:text-white transition-all duration-300 font-sora text-sm sm:text-base"
                    placeholder="https://example.com/news-article"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#EF3866] hover:bg-[#d63055] text-white font-semibold px-8 py-4 sm:px-12 sm:py-5 rounded-2xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed font-sora text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        <span>Analyzing News...</span>
                      </div>
                    ) : (
                      "Verify News Article"
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mb-8 p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-2xl shadow-lg border border-red-200 dark:border-red-800 transition-colors duration-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-800/30 rounded-full flex items-center justify-center">
                    <span className="text-red-600 dark:text-red-400 text-sm font-bold">!</span>
                  </div>
                  <div>
                    <h3 className="font-semibold font-sora mb-1">Verification Error</h3>
                    <p className="font-sora text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Status */}
            {saveStatus && (
              <div className={`mb-8 p-4 sm:p-6 rounded-2xl shadow-lg transition-colors duration-300 ${
                saveStatus.includes("successfully") 
                  ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800" 
                  : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
              }`}>
                <p className="font-sora text-sm">{saveStatus}</p>
              </div>
            )}

            {/* Verification Results */}
            {result && (
              <div className="space-y-8">
                {/* Main Verdict Card */}
                <div className="bg-white dark:bg-black p-6 sm:p-8 lg:p-10 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                  <div className="text-center mb-8">
                    <h2 className="font-sora text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                      Verification Complete
                    </h2>
                    <div className="w-20 h-1 bg-[#EF3866] mx-auto rounded-full"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {/* Verdict */}
                    <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors duration-300">
                      <h3 className="font-sora text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Verdict
                      </h3>
                      <p className={`text-2xl sm:text-3xl font-bold font-sora ${getVerdictColor(result.verdict)}`}>
                        {result.verdict}
                      </p>
                    </div>

                    {/* Credibility Score */}
                    <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors duration-300">
                      <h3 className="font-sora text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Credibility Score
                      </h3>
                      <p className={`text-2xl sm:text-3xl font-bold font-sora ${getScoreColor(result.verification_data?.source_confidence || 0)}`}>
                        {result.verification_data?.source_confidence || "N/A"}/100
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {result.verification_data?.ai_confidence_level && (
                    <div className="mt-6 text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 transition-colors duration-300">
                      <p className="font-sora text-sm text-blue-800 dark:text-blue-300">
                        <span className="font-semibold">AI Confidence Level:</span> {result.verification_data.ai_confidence_level}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                {result.status_message && (
                  <div className="bg-white dark:bg-black p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <h3 className="font-sora text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                      <span className="w-8 h-8 bg-[#EF3866] rounded-full flex items-center justify-center text-white text-sm">📋</span>
                      Status Summary
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-2xl transition-colors duration-300">
                      <pre className="font-sora text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {result.status_message}
                      </pre>
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {result.llm_response && (
                  <div className="bg-white dark:bg-black p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <h3 className="font-sora text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                      <span className="w-8 h-8 bg-[#EF3866] rounded-full flex items-center justify-center text-white text-sm">🤖</span>
                      AI Analysis
                    </h3>
                    <div className="bg-gray-50 dark:bg-black p-4 sm:p-6 rounded-2xl transition-colors duration-300">
                      <pre className="font-sora text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {result.llm_response}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Matched Sources */}
                {result.verification_data?.matched_sources && result.verification_data.matched_sources.length > 0 && (
                  <div className="bg-white dark:bg-black p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <h3 className="font-sora text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                      <span className="w-8 h-8 bg-[#EF3866] rounded-full flex items-center justify-center text-white text-sm">🔗</span>
                      Matched Sources
                    </h3>
                    <div className="grid gap-3">
                      {result.verification_data.matched_sources.map((source, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl transition-colors duration-300">
                          <p className="font-sora text-sm text-gray-800 dark:text-gray-200 break-all">
                            {typeof source === 'string' ? source : JSON.stringify(source)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Verification Details */}
                <div className="bg-white dark:bg-black p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                  <h3 className="font-sora text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="w-8 h-8 bg-[#EF3866] rounded-full flex items-center justify-center text-white text-sm">📊</span>
                    Complete Verification Data
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-2xl transition-colors duration-300">
                    <pre className="font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 max-h-[400px] overflow-auto leading-relaxed">
                      {JSON.stringify(result.verification_data ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}