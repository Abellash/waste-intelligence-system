"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getReports,
  getHotspots,
  recalculateHotspots,
  getRecentFollowUps,
  getUserTrust,
} from "@/lib/api";

function getPriorityLabel(priorityScore?: number | null) {
  if (priorityScore === null || priorityScore === undefined) return "Not calculated yet";
  if (priorityScore <= 2) return "Low";
  if (priorityScore <= 4) return "Medium";
  if (priorityScore <= 6) return "High";
  return "Critical";
}

function getPriorityBadgeClasses(priorityScore?: number | null) {
  if (priorityScore === null || priorityScore === undefined) {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }
  if (priorityScore <= 2) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (priorityScore <= 4) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (priorityScore <= 6) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  return "bg-red-50 text-red-700 border-red-200";
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [recentFollowUps, setRecentFollowUps] = useState<any[]>([]);
  const [userTrustMap, setUserTrustMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDashboardData() {
    try {
      const [reportData, hotspotData, followupData] = await Promise.all([
        getReports(),
        getHotspots(),
        getRecentFollowUps(),
      ]);

      setReports(reportData);
      setHotspots(hotspotData);
      setRecentFollowUps(followupData);

      const userIds: string[] = Array.from(
  new Set(reportData.map((r: any) => r.user_id).filter(Boolean))
) as string[];

const trustEntries = await Promise.all(
  userIds.map(async (userId: string) => {
    try {
      const trust = await getUserTrust(userId);
      return [userId, trust];
    } catch {
      return [userId, null];
    }
  })
);

      setUserTrustMap(Object.fromEntries(trustEntries));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setMessage("Temporary issue loading dashboard data. Try refreshing once.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleRecalculateHotspots() {
    setRecalcLoading(true);
    setMessage("");

    try {
      await recalculateHotspots();
      await loadDashboardData();
      setMessage("Hotspots recalculated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to recalculate hotspots.");
    } finally {
      setRecalcLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = reports.length;
    const unresolved = reports.filter((r) => r.status !== "resolved").length;
    const analyzed = reports.filter((r) => r.severity_label).length;
    const highPriority = reports.filter(
      (r) => r.priority_score !== null && r.priority_score !== undefined && r.priority_score >= 5
    ).length;
    const criticalPriority = reports.filter(
      (r) => r.priority_score !== null && r.priority_score !== undefined && r.priority_score >= 7
    ).length;
    const dispatched = reports.filter((r) => r.status === "dispatched").length;
    const underReview = reports.filter((r) => r.status === "under_review").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;

    return {
      total,
      unresolved,
      analyzed,
      highPriority,
      criticalPriority,
      hotspotCount: hotspots.length,
      dispatched,
      underReview,
      resolved,
      recentFollowUps: recentFollowUps.length,
    };
  }, [reports, hotspots, recentFollowUps]);

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const aPriority = a.priority_score ?? -1;
      const bPriority = b.priority_score ?? -1;
      return bPriority - aPriority;
    });
  }, [reports]);

  const topUsers = useMemo(() => {
    return Object.values(userTrustMap)
      .filter(Boolean)
      .sort((a: any, b: any) => (b.trust_score ?? 0) - (a.trust_score ?? 0));
  }, [userTrustMap]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg text-gray-700">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
              Waste Intelligence Platform
            </p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Monitor reports, hotspot activity, trust signals, and high-priority locations.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRecalculateHotspots}
              disabled={recalcLoading}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {recalcLoading ? "Recalculating..." : "Recalculate Hotspots"}
            </button>

            <Link
              href="/"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-100"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        ) : null}

        <SectionCard
          title="How the System Works"
          subtitle="A quick overview of the reporting and decision pipeline."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "User submits a report with image, location, and comment.",
              "AI analyzes the image for waste presence, type, and severity.",
              "Comments are analyzed for urgency and recurrence.",
              "Reports are grouped into hotspots using DBSCAN clustering.",
              "Priority score is computed using severity, community activity, follow-ups, and trust.",
              "Admins can track, dispatch, and resolve reports through the dashboard.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionCard>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <StatCard label="Total Reports" value={stats.total} />
          <StatCard label="Unresolved" value={stats.unresolved} />
          <StatCard label="Under Review" value={stats.underReview} />
          <StatCard label="Dispatched" value={stats.dispatched} />
          <StatCard label="Resolved" value={stats.resolved} />
          <StatCard label="Analyzed" value={stats.analyzed} />
          <StatCard label="High Priority" value={stats.highPriority} />
          <StatCard label="Critical Priority" value={stats.criticalPriority} />
          <StatCard label="Hotspots" value={stats.hotspotCount} />
          <StatCard label="Recent Follow-Ups" value={stats.recentFollowUps} />
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          <SectionCard
            title="Top Community Contributors"
            subtitle="Users ranked by trust score."
          >
            {topUsers.length === 0 ? (
              <p className="text-sm text-gray-600">No user trust data yet.</p>
            ) : (
              <div className="space-y-3">
                {topUsers.slice(0, 10).map((user: any, index) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Contributor #{index + 1}
                        </p>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          {user.name || user.id}
                        </p>
                        <p className="text-sm text-gray-500">{user.id}</p>
                      </div>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                        Trust {user.trust_score ?? "N/A"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                      <div>
                        <span className="font-medium text-gray-900">Role:</span> {user.role || "user"}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Reports:</span> {user.reports_count ?? 0}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-900">Confirmed Reports:</span>{" "}
                        {user.confirmed_reports_count ?? 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Top 5 Hotspots Today"
            subtitle="Highest concentration areas based on clustering."
          >
            {hotspots.length === 0 ? (
              <p className="text-sm text-gray-600">
                No hotspots found yet. Create nearby reports and click Recalculate Hotspots.
              </p>
            ) : (
              <div className="space-y-3">
                {hotspots.slice(0, 5).map((hotspot, index) => (
                  <div
                    key={hotspot.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">#{index + 1}</p>
                      <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                        {hotspot.hotspot_level || "Unclassified"}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium text-gray-900">Hotspot ID:</span> {hotspot.id}</p>
                      <p>
                        <span className="font-medium text-gray-900">Center:</span>{" "}
                        {hotspot.center_lat}, {hotspot.center_lng}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900">Report Count:</span>{" "}
                        {hotspot.report_count}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900">Average Priority:</span>{" "}
                        {hotspot.average_priority}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900">Updated At:</span>{" "}
                        {hotspot.updated_at}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <SectionCard
            title="Recent Follow-Up Activity"
            subtitle="Latest community updates attached to reports."
          >
            {recentFollowUps.length === 0 ? (
              <p className="text-sm text-gray-600">No follow-up activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentFollowUps.map((followUp) => (
                  <div
                    key={followUp.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium text-gray-900">Report ID:</span> {followUp.report_id}</p>
                      <p><span className="font-medium text-gray-900">User:</span> {followUp.user_id}</p>
                      <p><span className="font-medium text-gray-900">Response:</span> {followUp.response_type}</p>
                      <p><span className="font-medium text-gray-900">Note:</span> {followUp.note || "No note"}</p>
                      <p><span className="font-medium text-gray-900">Created At:</span> {followUp.created_at}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Top 5 Critical Locations Today"
            subtitle="Highest-priority report locations right now."
          >
            {sortedReports.length === 0 ? (
              <p className="text-sm text-gray-600">No reports available.</p>
            ) : (
              <div className="space-y-3">
                {sortedReports.slice(0, 5).map((report, index) => (
                  <div
                    key={report.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">#{index + 1}</p>
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${getPriorityBadgeClasses(
                          report.priority_score
                        )}`}
                      >
                        {getPriorityLabel(report.priority_score)}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium text-gray-900">Priority:</span> {report.priority_score ?? "Not calculated yet"}</p>
                      <p><span className="font-medium text-gray-900">Status:</span> {report.status}</p>
                      <p>
                        <span className="font-medium text-gray-900">Location:</span>{" "}
                        {report.latitude}, {report.longitude}
                      </p>
                      <p><span className="font-medium text-gray-900">Comment:</span> {report.user_comment || "No comment"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Top Priority Reports"
          subtitle="Priority-ranked reports with direct navigation to detail view."
        >
          {sortedReports.length === 0 ? (
            <p className="text-sm text-gray-600">No reports available.</p>
          ) : (
            <div className="space-y-4">
              {sortedReports.slice(0, 10).map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="block rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Report
                      </p>
                      <p className="mt-1 break-all text-base font-semibold text-gray-900">
                        {report.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${getPriorityBadgeClasses(
                          report.priority_score
                        )}`}
                      >
                        {getPriorityLabel(report.priority_score)}
                      </span>
                      <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700">
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                    <p><span className="font-medium text-gray-900">Reporter:</span> {report.user_id}</p>
                    <p>
                      <span className="font-medium text-gray-900">Reporter Trust:</span>{" "}
                      {userTrustMap[report.user_id]?.trust_score ?? "Unknown"}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium text-gray-900">Comment:</span>{" "}
                      {report.user_comment || "No comment"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Severity:</span>{" "}
                      {report.severity_label || "Not analyzed yet"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Priority Score:</span>{" "}
                      {report.priority_score ?? "Not calculated yet"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Hotspot ID:</span>{" "}
                      {report.hotspot_id || "None"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Waste Type:</span>{" "}
                      {report.waste_type || "Not analyzed yet"}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium text-gray-900">Location:</span>{" "}
                      {report.latitude}, {report.longitude}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}