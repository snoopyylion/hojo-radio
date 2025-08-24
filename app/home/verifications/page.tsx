"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Clock, Shield, CheckCircle, AlertTriangle, XCircle, ExternalLink, Trash2, User, Globe } from "lucide-react";

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

type SavedVerification = {
  id: string;
  headline: string;
  content: string;
  source_url?: string;
  verdict: string;
  credibility_score: number;
  confidence_level: string;
  matched_sources: string[];
  created_at: string;
  user_id?: string;
};

export default function VerifyNewsPage() {
  const { getToken } = useAuth();
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  // Recent verifications state
  const [userVerifications, setUserVerifications] = useState<SavedVerification[]>([]);
  const [generalVerifications, setGeneralVerifications] = useState<SavedVerification[]>([]);
  const [loadingVerifications, setLoadingVerifications] = useState(true);

  const fetchRecentVerifications = useCallback(async () => {
    try {
      setLoadingVerifications(true);
      
      // Fetch user's verifications using the same endpoint as VerifiedList
      const token = await getToken();
      const userResponse = await fetch("/api/news-verification/verification-list?page=1&limit=5", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserVerifications(userData.verifications || []);
      }
      
      // Fetch general recent verifications
      const generalResponse = await fetch("/api/news-verification/general?limit=8");
      if (generalResponse.ok) {
        const generalData = await generalResponse.json();
        setGeneralVerifications(generalData.verifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent verifications:", err);
    } finally {
      setLoadingVerifications(false);
    }
  }, [getToken]);

  // Fetch recent verifications on component mount
  useEffect(() => {
    fetchRecentVerifications();
  }, [fetchRecentVerifications]);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSaveStatus(null);
    setLoading(true);

    try {
      // Check if verification API is configured
      if (!process.env.NEXT_PUBLIC_VERIFICATION_API) {
        throw new Error("Verification API is not configured. Please check your environment variables.");
      }

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
        if (verificationRes.status === 401) {
          throw new Error("Verification API key is invalid or missing. Please check your configuration.");
        }
        throw new Error(`Verification failed: ${errorText}`);
      }

      const verificationResult: VerificationResult = await verificationRes.json();
      setResult(verificationResult);

      try {
        const token = await getToken();
        const saveRes = await fetch("/api/news-verification", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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
        // Refresh recent verifications
        fetchRecentVerifications();
      } catch (saveErr: unknown) {
        console.error("Save error:", saveErr);
        if (saveErr instanceof Error) {
          setSaveStatus(`Warning: ${saveErr.message}`);
        } else {
          setSaveStatus("Warning: Verification completed but failed to save to database");
        }
      }
      
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Something went wrong");
        
        // If it's an API key error, offer to save as manual verification
        if (err.message.includes("API key") || err.message.includes("not configured")) {
          const shouldSaveManual = window.confirm(
            "The verification API is not available. Would you like to save this as a manual verification entry?"
          );
          
          if (shouldSaveManual) {
            const manualResult: VerificationResult = {
              verdict: "Manual Entry",
              verification_data: {
                source_confidence: 50,
                ai_confidence_level: "Manual",
                matched_sources: []
              },
              llm_response: "This was saved as a manual verification entry due to API unavailability.",
              status_message: "Manual verification entry"
            };
            
            setResult(manualResult);
            
            // Try to save the manual verification
            try {
              const token = await getToken();
              const saveRes = await fetch("/api/news-verification", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  headline,
                  content,
                  source_url: sourceUrl,
                  verdict: manualResult.verdict,
                  credibility_score: manualResult.verification_data?.source_confidence || 50,
                  confidence_level: manualResult.verification_data?.ai_confidence_level || "Manual",
                  matched_sources: manualResult.verification_data?.matched_sources || [],
                }),
              });

              if (saveRes.ok) {
                setSaveStatus("Manual verification saved successfully!");
                fetchRecentVerifications();
              }
            } catch (saveErr) {
              console.error("Manual save error:", saveErr);
            }
          }
        }
      } else {
        setError("Something went wrong");
      }
    }

    setLoading(false);
  };

  const deleteVerification = async (id: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/news-verification/verification-list?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setUserVerifications(prev => prev.filter(v => v.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete verification:", err);
    }
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

  const getVerdictIcon = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "likely fake":
      case "fake":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-2 py-2 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          AI News Verification
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Enter a headline, article content, or source URL to check its accuracy and credibility.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Verification Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm md:p-8">
              <div className="space-y-6">
                {/* News Headline */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    News Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Enter the news headline..."
                  />
                </div>

                {/* Article Content */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Article Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                    placeholder="Paste the full article content here..."
                  />
                </div>

                {/* Source URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Source URL <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="https://example.com/news-article"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-[#EF3866] text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Verify Now
                    </>
                  )}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              )}

              {/* Save Status */}
              {saveStatus && (
                <div className={`mt-6 p-4 rounded-xl ${
                  saveStatus.includes("successfully") 
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                    : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                }`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className={saveStatus.includes("successfully") ? "text-green-800 dark:text-green-200" : "text-yellow-800 dark:text-yellow-200"}>
                      {saveStatus}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Verification Results */}
            {result && (
              <div className="mt-8 space-y-6">
                {/* Main Results Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Verdict */}
                    <div className="text-center p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        {getVerdictIcon(result.verdict)}
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300">Verdict</h3>
                      </div>
                      <p className={`text-2xl font-bold ${getVerdictColor(result.verdict)}`}>
                        {result.verdict}
                      </p>
                    </div>

                    {/* Credibility Score */}
                    <div className="text-center p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
                      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Credibility Score</h3>
                      <p className={`text-2xl font-bold ${getScoreColor(result.verification_data?.source_confidence || 0)}`}>
                        {result.verification_data?.source_confidence || 0}/100
                      </p>
                    </div>
                  </div>

                  {/* AI Confidence Level */}
                  {result.verification_data?.ai_confidence_level && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <p className="text-blue-800 dark:text-blue-200 text-center">
                        <span className="font-semibold">AI Confidence Level:</span> {result.verification_data.ai_confidence_level}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                {result.llm_response && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        🤖
                      </div>
                      AI Analysis
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                      <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {result.llm_response}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Status Message */}
                {result.status_message && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-full flex items-center justify-center">
                        📋
                      </div>
                      Status Summary
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                      <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {result.status_message}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Matched Sources */}
                {result.verification_data?.matched_sources && result.verification_data.matched_sources.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                        🔗
                      </div>
                      Matched Sources
                    </h3>
                    <div className="space-y-3">
                      {result.verification_data.matched_sources.map((source, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl flex items-center gap-3">
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                          <p className="text-sm text-gray-800 dark:text-gray-200 break-all flex-1">
                            {typeof source === 'string' ? source : JSON.stringify(source)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Complete Verification Data */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      📊
                    </div>
                    Complete Verification Data
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl max-h-96 overflow-auto">
                    <pre className="text-xs text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                      {JSON.stringify(result.verification_data ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Recent Verifications */}
          <div className="space-y-8">
            {/* User's Recent Verifications */}
            <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Recent Verifications</h3>
              </div>
              
              {loadingVerifications ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : userVerifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userVerifications.map((verification) => (
                    <div key={verification.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getVerdictIcon(verification.verdict)}
                            <span className={`text-xs font-medium ${getVerdictColor(verification.verdict)}`}>
                              {verification.verdict}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                            {verification.headline}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(verification.created_at)}</span>
                            <span className={`ml-2 font-medium ${getScoreColor(verification.credibility_score)}`}>
                              {verification.credibility_score}/100
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteVerification(verification.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  No verifications yet. Start by verifying your first article!
                </p>
              )}
            </div>

            {/* General Recent Verifications */}
            <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Community Verifications</h3>
              </div>
              
              {loadingVerifications ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : generalVerifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {generalVerifications.map((verification) => (
                    <div key={verification.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        {getVerdictIcon(verification.verdict)}
                        <span className={`text-xs font-medium ${getVerdictColor(verification.verdict)}`}>
                          {verification.verdict}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                        {verification.headline}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(verification.created_at)}</span>
                        <span className={`ml-2 font-medium ${getScoreColor(verification.credibility_score)}`}>
                          {verification.credibility_score}/100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  No community verifications available yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}