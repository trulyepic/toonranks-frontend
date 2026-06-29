import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ForumPersonalFeed from "./ForumPersonalFeed";
import { fetchMyBookmarks, fetchMyFollowing } from "../api/manApi";

vi.mock("../api/manApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/manApi")>();
  const emptyPage = {
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
    has_prev: false,
    has_next: false,
  };

  return {
    ...actual,
    fetchMyFollowing: vi.fn().mockResolvedValue(emptyPage),
    fetchMyBookmarks: vi.fn().mockResolvedValue(emptyPage),
  };
});

const mockedFetchMyBookmarks = vi.mocked(fetchMyBookmarks);
const mockedFetchMyFollowing = vi.mocked(fetchMyFollowing);

function renderFeed(view: "following" | "saved") {
  return render(
    <MemoryRouter>
      <ForumPersonalFeed view={view} />
    </MemoryRouter>
  );
}

describe("ForumPersonalFeed", () => {
  it("renders bookmarked posts from the saved view", async () => {
    const imageUrl = "https://example.com/forum/her-summon2.png";
    mockedFetchMyBookmarks.mockResolvedValueOnce({
      items: [
        {
          id: 42,
          thread_id: 7,
          author_username: "reader",
          content_markdown: `![summon](${imageUrl})\n\nThis bookmarked reply should render in the tab.`,
          created_at: "2026-06-28T12:00:00Z",
          updated_at: "2026-06-28T12:00:00Z",
          series_refs: [],
        },
      ],
      page: 1,
      page_size: 20,
      total: 1,
      total_pages: 1,
      has_prev: false,
      has_next: false,
    });

    renderFeed("saved");

    expect(
      await screen.findByText("This bookmarked reply should render in the tab.")
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "summon" })).toHaveAttribute(
      "src",
      imageUrl
    );
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.queryByText(/!\[summon\]/)).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/forum/7#post-42");
    expect(mockedFetchMyBookmarks).toHaveBeenCalledWith(1, 20);
    expect(mockedFetchMyFollowing).not.toHaveBeenCalled();
  });
});
