import { supabase } from "@/lib/supabase";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function getReports() {
  const response = await fetch(`${API_BASE_URL}/reports`);
  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }
  return response.json();
}

export async function getReportById(reportId: string) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch report");
  }
  return response.json();
}

export async function createReport(data: {
  user_id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  user_comment?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create report: ${errorText}`);
  }

  return response.json();
}

export async function getComments(reportId: string) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/comments`);
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  return response.json();
}

export async function createComment(
  reportId: string,
  data: {
    user_id: string;
    comment_text: string;
    parent_comment_id?: string | null;
  }
) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create comment");
  }

  return response.json();
}

export async function analyzeReport(reportId: string) {
  const response = await fetch(`${API_BASE_URL}/ai/analyze-report/${reportId}`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to analyze report: ${errorText}`);
  }

  return response.json();
}

export async function recalculatePriority(reportId: string) {
  const response = await fetch(
    `${API_BASE_URL}/reports/${reportId}/recalculate-priority`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to recalculate priority");
  }

  return response.json();
}

export async function uploadImage(file: File) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `reports/${fileName}`;

  const { error } = await supabase.storage
    .from("waste-images")
    .upload(filePath, file);

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data } = supabase.storage
    .from("waste-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function voteComment(
  commentId: string,
  data: { user_id: string; vote_type: "upvote" | "downvote" }
) {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to vote on comment");
  }

  return response.json();
}

export async function getCommentVotes(commentId: string) {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}/votes`);
  if (!response.ok) {
    throw new Error("Failed to fetch comment votes");
  }
  return response.json();
}

export async function deleteComment(commentId: string, requesterUserId: string) {
  const response = await fetch(
    `${API_BASE_URL}/comments/${commentId}?requester_user_id=${requesterUserId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete comment");
  }

  return response.json();
}

export async function deleteReport(reportId: string, requesterUserId: string) {
  const response = await fetch(
    `${API_BASE_URL}/reports/${reportId}?requester_user_id=${requesterUserId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete report");
  }

  return response.json();
}

export async function recalculateHotspots() {
  const response = await fetch(`${API_BASE_URL}/hotspots/recalculate`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to recalculate hotspots");
  }

  return response.json();
}

export async function getHotspots() {
  const response = await fetch(`${API_BASE_URL}/hotspots`);
  if (!response.ok) {
    throw new Error("Failed to fetch hotspots");
  }

  return response.json();
}

export async function updateReportStatus(
  reportId: string,
  data: { requester_user_id: string; status: string }
) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update report status: ${errorText}`);
  }

  return response.json();
}

export async function createFollowUp(
  reportId: string,
  data: {
    user_id: string;
    response_type: string;
    note?: string;
  }
) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/followups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create follow-up: ${errorText}`);
  }

  return response.json();
}

export async function getFollowUps(reportId: string) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/followups`);
  if (!response.ok) {
    throw new Error("Failed to fetch follow-ups");
  }
  return response.json();
}

export async function getRecentFollowUps() {
  const response = await fetch(`${API_BASE_URL}/followups/recent`);
  if (!response.ok) {
    throw new Error("Failed to fetch recent follow-ups");
  }
  return response.json();
}

export async function getUserTrust(userId: string) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/trust`);
  if (!response.ok) {
    throw new Error("Failed to fetch user trust");
  }
  return response.json();
}

export async function penalizeUser(
  userId: string,
  data: { requester_user_id: string; amount?: number }
) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/penalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to penalize user: ${errorText}`);
  }

  return response.json();
}

