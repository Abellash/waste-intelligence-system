"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getReports } from "@/lib/api";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

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

export default function HomePage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReports();
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
              Waste Intelligence Platform
            </p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-gray-900">
              Community Waste Reports
            </h1>
            <p className="mt-2 text-gray-600">
              View reported waste locations, priority levels, and hotspot activity across the city.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              Admin Dashboard
            </Link>
            <Link
              href="/report"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-100"
            >
              Create Report
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {loading ? (
            <div className="flex h-[420px] items-center justify-center">
              <p className="text-lg text-gray-600">Loading map...</p>
            </div>
          ) : (
            <MapView reports={reports} />
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Recent Reports</h2>
              <p className="mt-1 text-sm text-gray-500">
                Click any report to view details, comments, and analysis.
              </p>
            </div>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
              {reports.length} total
            </span>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-gray-600">No reports found.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
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

                      {report.ai_mode ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                          AI: {report.ai_mode}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
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
                      <span className="font-medium text-gray-900">Waste Type:</span>{" "}
                      {report.waste_type || "Not analyzed yet"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Waste Present:</span>{" "}
                      {report.waste_present === null || report.waste_present === undefined
                        ? "Not analyzed yet"
                        : String(report.waste_present)}
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
        </section>
      </div>
    </main>
  );
}