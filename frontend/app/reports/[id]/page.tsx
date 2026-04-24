"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getReportById,
  getComments,
  createComment,
  analyzeReport,
  recalculatePriority,
  voteComment,
  getCommentVotes,
  deleteComment,
  deleteReport,
  updateReportStatus,
  createFollowUp,
  getFollowUps,
  penalizeUser,
} from "@/lib/api";

const ADMIN_IDS = ["abellash"];

function Badge({
  label,
  tone = "gray",
}: {
  label: string;
  tone?: "green" | "yellow" | "red" | "blue" | "purple" | "gray";
}) {
  const tones: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    purple: "bg-purple-100 text-purple-800 border-purple-300",
    gray: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

function AgentStep({
  title,
  status,
  detail,
  tone = "gray",
}: {
  title: string;
  status: string;
  detail: string;
  tone?: "green" | "yellow" | "red" | "blue" | "purple" | "gray";
}) {
  return (
    <div className="border border-slate-300 rounded-lg p-4 bg-slate-100">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-semibold">{title}</h3>
        <Badge label={status} tone={tone} />
      </div>
      <p className="text-sm text-gray-600">{detail}</p>
    </div>
  );
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [currentUserId, setCurrentUserId] = useState("abellash");

  const [report, setReport] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const [commentForm, setCommentForm] = useState({
    comment_text: "",
  });

  const [replyForms, setReplyForms] = useState<{ [key: string]: string }>({});

  const [selectedFollowUpType, setSelectedFollowUpType] = useState("still_there");
  const [followUpNote, setFollowUpNote] = useState("");

  const [message, setMessage] = useState("");

  const isAdmin = ADMIN_IDS.includes(currentUserId);

  async function loadVoteCounts(commentList: any[]) {
    const entries = await Promise.all(
      commentList.map(async (comment) => {
        try {
          const voteData = await getCommentVotes(comment.id);
          return [comment.id, voteData];
        } catch {
          return [comment.id, { upvotes: 0, downvotes: 0, score: 0 }];
        }
      })
    );

    setVoteCounts(Object.fromEntries(entries));
  }

  async function loadReportData() {
    try {
      const [reportData, commentsData, followUpData] = await Promise.all([
        getReportById(reportId),
        getComments(reportId),
        getFollowUps(reportId),
      ]);

      setReport(reportData);
      setComments(commentsData);
      setFollowUps(followUpData);

      await loadVoteCounts(commentsData);
    } catch (error) {
      console.error("Error loading report data:", error);
      setMessage("Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!reportId) return;
    loadReportData();
  }, [reportId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setCommentForm({
      ...commentForm,
      [e.target.name]: e.target.value,
    });
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      await createComment(reportId, {
        user_id: currentUserId,
        comment_text: commentForm.comment_text,
        parent_comment_id: null,
      });

      await recalculatePriority(reportId);
      await loadReportData();

      setMessage("Comment added successfully.");

      setCommentForm({
        comment_text: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Failed to add comment.");
    }
  }

  async function handleReplySubmit(parentId: string) {
    try {
      if (!replyForms[parentId]?.trim()) return;

      await createComment(reportId, {
        user_id: currentUserId,
        comment_text: replyForms[parentId],
        parent_comment_id: parentId,
      });

      await recalculatePriority(reportId);
      await loadReportData();

      setReplyForms({ ...replyForms, [parentId]: "" });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAnalyzeReport() {
    setAiLoading(true);
    setMessage("");

    try {
      await analyzeReport(reportId);
      await recalculatePriority(reportId);
      await loadReportData();
      setMessage("AI analysis completed successfully.");
    } catch (error) {
      console.error(error);
      setMessage(
        "AI analysis is temporarily unavailable because the Gemini quota has been exceeded. Please try again later."
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function handleVote(commentId: string, voteType: "upvote" | "downvote") {
    try {
      await voteComment(commentId, {
        user_id: currentUserId,
        vote_type: voteType,
      });

      await loadReportData();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment(commentId, currentUserId);
      await recalculatePriority(reportId);
      await loadReportData();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete comment.");
    }
  }

  async function handleDeleteReport() {
    try {
      await deleteReport(reportId, currentUserId);
      router.push("/");
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete report.");
    }
  }

  async function handleUpdateStatus(status: string) {
    try {
      await updateReportStatus(reportId, {
        requester_user_id: currentUserId,
        status,
      });
      await loadReportData();
      setMessage(`Report marked as ${status}.`);
    } catch (error) {
      console.error(error);
      setMessage("Failed to update report status.");
    }
  }

  async function handleFollowUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      await createFollowUp(reportId, {
        user_id: currentUserId,
        response_type: selectedFollowUpType,
        note: followUpNote,
      });

      await loadReportData();

      setMessage("Follow-up added successfully.");
      setSelectedFollowUpType("still_there");
      setFollowUpNote("");
    } catch (error) {
      console.error(error);
      setMessage("Failed to add follow-up.");
    }
  }

  async function handlePenalizeReporter() {
    try {
      if (!report?.user_id) return;

      await penalizeUser(report.user_id, {
        requester_user_id: currentUserId,
        amount: 0.2,
      });

      await loadReportData();
      setMessage("Reporter trust score reduced.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to penalize reporter.");
    }
  }

  function followUpButtonClass(type: string) {
    const base = "px-4 py-2 rounded border font-medium";
    const active = "text-white";
    const inactive = "bg-white text-black border-slate-300";

    if (selectedFollowUpType !== type) return `${base} ${inactive}`;

    if (type === "still_there") return `${base} bg-yellow-600 border-yellow-700 ${active}`;
    if (type === "worse") return `${base} bg-red-600 border-red-700 ${active}`;
    if (type === "cleaned") return `${base} bg-green-600 border-green-700 ${active}`;
    return `${base} bg-gray-700 border-gray-800 ${active}`;
  }

  const parentComments = comments.filter((c) => !c.parent_comment_id);
  const replies = comments.filter((c) => c.parent_comment_id);

  const urgencyCount = comments.filter((c) => c.urgency_flag).length;
  const recurrenceCount = comments.filter((c) => c.recurrence_flag).length;
  const resolvedCount = comments.filter((c) => c.resolved_flag).length;

  const stillThereFollowUps = followUps.filter(
    (f) => f.response_type === "still_there"
  ).length;
  const worseFollowUps = followUps.filter(
    (f) => f.response_type === "worse"
  ).length;
  const cleanedFollowUps = followUps.filter(
    (f) => f.response_type === "cleaned"
  ).length;

  const confidenceLabel = useMemo(() => {
    const trust = report?.reporter?.trust_score ?? 1;
    if (trust >= 2) return "High Confidence";
    if (trust >= 1.2) return "Medium Confidence";
    return "Low Confidence";
  }, [report]);

  const priorityTone = useMemo(() => {
    if (typeof report?.priority_score !== "number") return "gray";
    if (report.priority_score >= 0.8) return "red";
    if (report.priority_score >= 0.4) return "yellow";
    return "green";
  }, [report]);

  const pipeline = useMemo(() => {
    const imageStatus =
      report?.ai_mode === "gemini"
        ? {
            label: "Gemini",
            tone: "blue" as const,
            detail: "Primary multimodal AI completed analysis.",
          }
        : report?.ai_mode === "fallback"
        ? {
            label: "Fallback",
            tone: "yellow" as const,
            detail: "Rule-based backup handled analysis.",
          }
        : report?.ai_status === "pending"
        ? {
            label: "Pending",
            tone: "gray" as const,
            detail: "Image analysis has not been run yet.",
          }
        : {
            label: "Unknown",
            tone: "gray" as const,
            detail: "No image-agent state available.",
          };

    const commentStatus =
      comments.length > 0
        ? {
            label: "Completed",
            tone: "green" as const,
            detail: `${comments.length} community comments processed.`,
          }
        : {
            label: "No Signals",
            tone: "gray" as const,
            detail: "No community comments yet.",
          };

    const priorityStatus =
      report?.priority_score !== null && report?.priority_score !== undefined
        ? {
            label: "Computed",
            tone: "purple" as const,
            detail: `Priority score = ${report.priority_score}`,
          }
        : {
            label: "Pending",
            tone: "gray" as const,
            detail: "Priority has not been calculated yet.",
          };

    const clusterStatus =
      report?.hotspot_id
        ? {
            label: "Assigned",
            tone: "red" as const,
            detail: `Mapped into hotspot ${report.hotspot_id}.`,
          }
        : {
            label: "Not Assigned",
            tone: "gray" as const,
            detail: "No hotspot cluster assigned yet.",
          };

    const followUpStatus =
      followUps.length > 0
        ? {
            label: "Updated",
            tone: "green" as const,
            detail: `${followUps.length} structured follow-up updates received.`,
          }
        : {
            label: "None",
            tone: "gray" as const,
            detail: "No follow-up signals submitted yet.",
          };

    return {
      imageStatus,
      commentStatus,
      priorityStatus,
      clusterStatus,
      followUpStatus,
    };
  }, [report, comments.length, followUps.length]);

  if (loading) {
    return <main className="p-8">Loading report...</main>;
  }

  if (!report) {
    return <main className="p-8">Report not found.</main>;
  }

  return (
    <main className="max-w-6xl mx-auto p-8 space-y-8 bg-slate-100 min-h-screen text-slate-900">
      <section className="border border-slate-300 rounded-xl p-6 bg-slate-50 shadow-sm">
        <div className="mb-4">
          <label className="block font-medium mb-1">Current User ID</label>
          <input
            type="text"
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="border border-slate-300 rounded p-2 w-full max-w-sm bg-white"
          />
          <p className="text-sm text-gray-600 mt-1">
            Admin demo user: <strong>abellash</strong>
          </p>
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Report Detail</h1>
            <p className="text-sm text-gray-600 mt-1">
              Multi-agent report intelligence view
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleAnalyzeReport}
              disabled={aiLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {aiLoading ? "Analyzing..." : "Run AI Analysis"}
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => handleUpdateStatus("under_review")}
                  className="bg-yellow-600 text-white px-4 py-2 rounded"
                >
                  Under Review
                </button>
                <button
                  onClick={() => handleUpdateStatus("dispatched")}
                  className="bg-orange-600 text-white px-4 py-2 rounded"
                >
                  Dispatched
                </button>
                <button
                  onClick={() => handleUpdateStatus("resolved")}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Resolved
                </button>
                <button
                  onClick={handlePenalizeReporter}
                  className="bg-purple-700 text-white px-4 py-2 rounded"
                >
                  Penalize Reporter
                </button>
                <button
                  onClick={handleDeleteReport}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete Report
                </button>
              </>
            )}
          </div>
        </div>

        {message && <p className="mb-4 text-sm text-gray-700">{message}</p>}

        <div className="flex gap-2 flex-wrap mb-6">
          <Badge label={`Status: ${report.status}`} tone="gray" />
          <Badge
            label={`AI: ${report.ai_mode || "pending"}`}
            tone={
              report.ai_mode === "gemini"
                ? "blue"
                : report.ai_mode === "fallback"
                ? "yellow"
                : "gray"
            }
          />
          <Badge
            label={`Priority: ${report.priority_score ?? "pending"}`}
            tone={priorityTone}
          />
          <Badge
            label={report.hotspot_id ? `Hotspot ${report.hotspot_id}` : "No Hotspot"}
            tone={report.hotspot_id ? "red" : "gray"}
          />
          <Badge
            label={confidenceLabel}
            tone={
              confidenceLabel === "High Confidence"
                ? "green"
                : confidenceLabel === "Medium Confidence"
                ? "yellow"
                : "gray"
            }
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p><strong>ID:</strong> {report.id}</p>
            <p><strong>Reporter ID:</strong> {report.user_id || "Unknown"}</p>
            <p><strong>Reporter Trust Score:</strong> {report.reporter?.trust_score ?? "Unknown"}</p>
            <p><strong>Reporter Reports Count:</strong> {report.reporter?.reports_count ?? "Unknown"}</p>
            <p><strong>Reporter Confirmed Reports:</strong> {report.reporter?.confirmed_reports_count ?? "Unknown"}</p>
            <p><strong>Confidence Level:</strong> {confidenceLabel}</p>
            <p><strong>Comment:</strong> {report.user_comment || "No comment"}</p>
            <p><strong>Status:</strong> {report.status}</p>
            <p><strong>Latitude:</strong> {report.latitude}</p>
            <p><strong>Longitude:</strong> {report.longitude}</p>
          </div>

          <div className="space-y-2">
            <p><strong>Waste Present:</strong> {String(report.waste_present)}</p>
            <p><strong>Waste Type:</strong> {report.waste_type || "Not analyzed yet"}</p>
            <p><strong>Severity Label:</strong> {report.severity_label || "Not analyzed yet"}</p>
            <p><strong>Severity Score:</strong> {report.severity_score ?? "Not analyzed yet"}</p>
            <p><strong>AI Status:</strong> {report.ai_status || "pending"}</p>
            <p><strong>AI Mode:</strong> {report.ai_mode || "pending"}</p>
            <p><strong>AI Error:</strong> {report.ai_error || "None"}</p>
            <p><strong>Priority Score:</strong> {report.priority_score ?? "Not calculated yet"}</p>
            <p><strong>Hotspot ID:</strong> {report.hotspot_id || "None"}</p>
            <p><strong>Created At:</strong> {report.created_at}</p>
            <p><strong>Resolved At:</strong> {report.resolved_at || "Not resolved yet"}</p>
          </div>
        </div>

        <div className="mt-6">
          <p><strong>Image:</strong></p>
          <img
            src={report.image_url}
            alt="Waste report"
            className="mt-2 w-full max-w-md rounded border border-slate-300"
          />
          <p className="mt-2 break-all text-sm text-gray-600">
            {report.image_url}
          </p>
        </div>
      </section>

      <section className="border border-slate-300 rounded-xl p-6 bg-slate-50 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Agent Pipeline</h2>
        <p className="text-sm text-gray-600 mb-5">
          This panel shows how the report moved through the multi-agent system.
        </p>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AgentStep
            title="Image Analysis Agent"
            status={pipeline.imageStatus.label}
            detail={pipeline.imageStatus.detail}
            tone={pipeline.imageStatus.tone}
          />
          <AgentStep
            title="Comment Analyzer Agent"
            status={pipeline.commentStatus.label}
            detail={pipeline.commentStatus.detail}
            tone={pipeline.commentStatus.tone}
          />
          <AgentStep
            title="Priority Ranker Agent"
            status={pipeline.priorityStatus.label}
            detail={pipeline.priorityStatus.detail}
            tone={pipeline.priorityStatus.tone}
          />
          <AgentStep
            title="Clustering Agent"
            status={pipeline.clusterStatus.label}
            detail={pipeline.clusterStatus.detail}
            tone={pipeline.clusterStatus.tone}
          />
          <AgentStep
            title="Status Checker Agent"
            status={pipeline.followUpStatus.label}
            detail={pipeline.followUpStatus.detail}
            tone={pipeline.followUpStatus.tone}
          />
          <AgentStep
            title="Trust / Reputation Agent"
            status={report?.reporter ? "Loaded" : "Unknown"}
            detail={
              report?.reporter
                ? `Trust score ${report.reporter.trust_score}, reports ${report.reporter.reports_count}, confirmed ${report.reporter.confirmed_reports_count}.`
                : "Reporter trust data unavailable."
            }
            tone={report?.reporter ? "green" : "gray"}
          />
        </div>
      </section>

      <section className="border border-slate-300 rounded-xl p-6 bg-slate-50 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Decision Explanation</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-3">AI Understanding</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Waste Type:</strong> {report.waste_type || "Unknown"}</p>
              <p><strong>Severity Label:</strong> {report.severity_label || "Unknown"}</p>
              <p><strong>Severity Score:</strong> {report.severity_score ?? "Unknown"}</p>
              <p><strong>AI Mode:</strong> {report.ai_mode || "pending"}</p>
              <p><strong>AI Status:</strong> {report.ai_status || "pending"}</p>
            </div>
          </div>

          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-3">Community Signals</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Total Comments:</strong> {comments.length}</p>
              <p><strong>Urgency Flags:</strong> {urgencyCount}</p>
              <p><strong>Recurrence Flags:</strong> {recurrenceCount}</p>
              <p><strong>Resolved Flags:</strong> {resolvedCount}</p>
              <p><strong>Still There Follow-ups:</strong> {stillThereFollowUps}</p>
              <p><strong>Worse Follow-ups:</strong> {worseFollowUps}</p>
              <p><strong>Cleaned Follow-ups:</strong> {cleanedFollowUps}</p>
            </div>
          </div>

          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-3">Trust Contribution</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Reporter Trust Score:</strong> {report.reporter?.trust_score ?? "Unknown"}</p>
              <p><strong>Reporter Reports Count:</strong> {report.reporter?.reports_count ?? "Unknown"}</p>
              <p><strong>Confirmed Reports:</strong> {report.reporter?.confirmed_reports_count ?? "Unknown"}</p>
              <p><strong>Confidence Level:</strong> {confidenceLabel}</p>
            </div>
          </div>

          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-3">Final Priority</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Priority Score:</strong> {report.priority_score ?? "Not calculated yet"}</p>
              <p><strong>Status:</strong> {report.status}</p>
              <p><strong>Hotspot ID:</strong> {report.hotspot_id || "None"}</p>
              <p>
                <strong>Interpretation:</strong>{" "}
                {typeof report.priority_score === "number"
                  ? report.priority_score >= 0.8
                    ? "Critical - immediate attention recommended."
                    : report.priority_score >= 0.4
                    ? "Moderate - should be reviewed soon."
                    : "Lower priority - monitor and validate further."
                  : "Priority not available yet."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-slate-300 rounded-xl p-6 bg-slate-50 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Status Update Widget</h2>
        <p className="text-sm text-gray-600 mb-4">
          Use this to submit a structured field update about the current condition of this location.
        </p>

        <form onSubmit={handleFollowUpSubmit} className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedFollowUpType("still_there")}
              className={followUpButtonClass("still_there")}
            >
              Still There
            </button>
            <button
              type="button"
              onClick={() => setSelectedFollowUpType("worse")}
              className={followUpButtonClass("worse")}
            >
              Worse
            </button>
            <button
              type="button"
              onClick={() => setSelectedFollowUpType("cleaned")}
              className={followUpButtonClass("cleaned")}
            >
              Cleaned
            </button>
            <button
              type="button"
              onClick={() => setSelectedFollowUpType("not_sure")}
              className={followUpButtonClass("not_sure")}
            >
              Not Sure
            </button>
          </div>

          <div>
            <label className="block font-medium mb-1">Optional Note</label>
            <textarea
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 bg-white"
              placeholder="Add a short update note"
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            Submit Status Update
          </button>
        </form>

        <div className="mt-6">
          <h3 className="font-bold mb-3">Follow-Up History</h3>

          {followUps.length === 0 ? (
            <p>No follow-up updates yet.</p>
          ) : (
            <div className="space-y-3">
              {followUps.map((followUp) => (
                <div key={followUp.id} className="border border-slate-300 rounded p-3 bg-white">
                  <p><strong>User:</strong> {followUp.user_id}</p>
                  <p><strong>Response:</strong> {followUp.response_type}</p>
                  <p><strong>Note:</strong> {followUp.note || "No note"}</p>
                  <p><strong>Created At:</strong> {followUp.created_at}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border border-slate-300 rounded-xl p-6 bg-slate-50 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Comments</h2>

        {parentComments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {parentComments.map((comment) => (
              <div key={comment.id} className="border border-slate-300 rounded p-4 bg-white">
                <p><strong>User:</strong> {comment.user_id}</p>
                <p><strong>Comment:</strong> {comment.comment_text}</p>
                <p><strong>Recurrence:</strong> {String(comment.recurrence_flag)}</p>
                <p><strong>Urgency:</strong> {String(comment.urgency_flag)}</p>
                <p><strong>Resolved:</strong> {String(comment.resolved_flag)}</p>
                <p><strong>Tags:</strong> {comment.tags?.length ? comment.tags.join(", ") : "None"}</p>
                <p>
                  <strong>Votes:</strong> 👍 {voteCounts[comment.id]?.upvotes ?? 0} | 👎{" "}
                  {voteCounts[comment.id]?.downvotes ?? 0}
                </p>
                <p><strong>Created At:</strong> {comment.created_at}</p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleVote(comment.id, "upvote")}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Upvote
                  </button>
                  <button
                    onClick={() => handleVote(comment.id, "downvote")}
                    className="bg-yellow-600 text-white px-3 py-1 rounded"
                  >
                    Downvote
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Reply..."
                    value={replyForms[comment.id] || ""}
                    onChange={(e) =>
                      setReplyForms({
                        ...replyForms,
                        [comment.id]: e.target.value,
                      })
                    }
                    className="border border-slate-300 p-2 w-full mb-2 rounded bg-white"
                  />
                  <button
                    onClick={() => handleReplySubmit(comment.id)}
                    className="bg-gray-800 text-white px-3 py-1 rounded"
                  >
                    Reply
                  </button>
                </div>

                <div className="ml-6 mt-4 space-y-2">
                  {replies
                    .filter((reply) => reply.parent_comment_id === comment.id)
                    .map((reply) => (
                      <div key={reply.id} className="border border-slate-300 rounded p-3 bg-slate-50">
                        <p><strong>User:</strong> {reply.user_id}</p>
                        <p><strong>Reply:</strong> {reply.comment_text}</p>
                        <p><strong>Created At:</strong> {reply.created_at}</p>
                        <p>
                          <strong>Votes:</strong> 👍 {voteCounts[reply.id]?.upvotes ?? 0} | 👎{" "}
                          {voteCounts[reply.id]?.downvotes ?? 0}
                        </p>

                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleVote(reply.id, "upvote")}
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Upvote
                          </button>
                          <button
                            onClick={() => handleVote(reply.id, "downvote")}
                            className="bg-yellow-600 text-white px-3 py-1 rounded"
                          >
                            Downvote
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteComment(reply.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-slate-300 rounded-xl p-6 bg-slate-50 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Add Comment</h2>

        <form onSubmit={handleCommentSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Comment</label>
            <textarea
              name="comment_text"
              value={commentForm.comment_text}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded p-2 bg-white"
              placeholder="Enter comment"
              rows={4}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Add Comment
          </button>
        </form>
      </section>
    </main>
  );
}