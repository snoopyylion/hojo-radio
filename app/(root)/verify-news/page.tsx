// /app/(root)/verify-news/page.tsx
'use client';

import { useState } from 'react';

export default function VerifyNewsPage() {
  const [headline, setHeadline] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/news-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          headline, 
          content,
          source_url: sourceUrl 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to verify news: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('An error occurred while verifying the news');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">News Verification Tool</h1>
      <p className="mb-6 text-gray-600">
        Submit news content below to verify its authenticity using AI.
      </p>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <label htmlFor="headline" className="block mb-2 font-medium">
            Headline
          </label>
          <input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3"
            placeholder="Enter the news headline"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="content" className="block mb-2 font-medium">
            News Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 h-64"
            placeholder="Paste the full news content here..."
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="sourceUrl" className="block mb-2 font-medium">
            Source URL (Optional)
          </label>
          <input
            id="sourceUrl"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3"
            placeholder="https://example.com/news-article"
            type="url"
          />
          <p className="text-sm text-gray-500 mt-1">
            Adding the original source URL can improve verification accuracy
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? 'Verifying...' : 'Verify News'}
        </button>
      </form>

      {error && (
        <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="p-6 border rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Verification Result</h2>
          
          {/* Status Message */}
          {result.status_message && (
            <div className="mb-4 p-4 bg-gray-100 rounded-md whitespace-pre-line">
              {result.status_message}
            </div>
          )}
          
          {/* Verdict */}
          <div className="mb-4">
            <span className="font-medium">Verdict: </span>
            <span className={
              result.verdict === "Verified" ? "text-green-600 font-bold" : 
              result.verdict === "Likely Fake" ? "text-red-600 font-bold" : 
              "text-yellow-600 font-bold"
            }>
              {result.verdict}
            </span>
          </div>
          
          {/* LLM Analysis */}
          {result.llm_response && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">AI Analysis:</h3>
              <div className="p-3 bg-gray-100 rounded-md whitespace-pre-line text-sm">
                {result.llm_response}
              </div>
            </div>
          )}
          
          {/* Verification Details */}
          {result.verification_data && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Verification Details:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Report ID:</span> {result.verification_data.report_id}</div>
                <div><span className="font-medium">Source Verified:</span> {result.verification_data.direct_source_verified ? "Yes" : "No"}</div>
                <div><span className="font-medium">Found in Reliable Sources:</span> {result.verification_data.found_in_reliable_sources ? "Yes" : "No"}</div>
                <div><span className="font-medium">Source Confidence:</span> {result.verification_data.source_confidence}/100</div>
                <div><span className="font-medium">Timestamp:</span> {result.verification_data.timestamp_utc}</div>
              </div>
              
              {/* Matched Sources */}
              {result.verification_data.matched_sources && result.verification_data.matched_sources.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-1">Matched Sources:</h4>
                  <ul className="list-disc pl-5 text-sm">
                    {result.verification_data.matched_sources.map((source: string, index: number) => (
                      <li key={index} className="text-gray-700 truncate">{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}