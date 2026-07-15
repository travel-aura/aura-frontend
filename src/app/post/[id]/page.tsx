import { API_BASE } from "@/lib/api";
import type { AuraWithUser } from "../../../../shared/aura-schema";
import PostDetailClient from "./_components/PostDetailClient";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let post: AuraWithUser | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/auras/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      post = data.aura ?? null;
    }
  } catch {
    // post stays null — client component handles the error state
  }

  return <PostDetailClient initialPost={post} postId={id} />;
}
