"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createReport, uploadImage, analyzeReport } from "@/lib/api";
import { useRouter } from "next/navigation";
const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
});

export default function ReportPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    user_id: "",
    user_comment: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }

  function handleSelectLocation(lat: number, lng: number) {
    setSelectedPosition([lat, lng]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!selectedFile) {
        setMessage("Please select an image.");
        setLoading(false);
        return;
      }

      if (!selectedPosition) {
        setMessage("Please select a location on the map.");
        setLoading(false);
        return;
      }

      const imageUrl = await uploadImage(selectedFile);

      const createdReport = await createReport({
        user_id: formData.user_id,
        image_url: imageUrl,
        latitude: selectedPosition[0],
        longitude: selectedPosition[1],
        user_comment: formData.user_comment,
      });

      try {
        await analyzeReport(createdReport.id);
      } catch (error) {
        console.error("AI analysis failed after report creation:", error);
      }

      router.push(`/reports/${createdReport.id}`);

      setMessage("Report created successfully.");

      setFormData({
        user_id: "",
        user_comment: "",
      });

      setSelectedFile(null);
      setSelectedPosition(null);
    } catch (error) {
      console.error(error);
      setMessage("Failed to create report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Create Waste Report</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">User ID</label>
          <input
            type="text"
            name="user_id"
            value={formData.user_id}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Enter user ID"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Pick Location on Map</label>
          <MapPicker
            selectedPosition={selectedPosition}
            onSelectLocation={handleSelectLocation}
          />
        </div>

        {selectedPosition && (
          <div className="text-sm text-gray-700">
            <p><strong>Selected Latitude:</strong> {selectedPosition[0]}</p>
            <p><strong>Selected Longitude:</strong> {selectedPosition[1]}</p>
          </div>
        )}

        <div>
          <label className="block font-medium mb-1">Comment</label>
          <textarea
            name="user_comment"
            value={formData.user_comment}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Optional comment"
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>

      {message && <p className="mt-4">{message}</p>}
    </main>
  );
}