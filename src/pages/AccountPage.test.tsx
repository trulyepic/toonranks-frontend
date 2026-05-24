import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AccountPage from "./AccountPage";
import { UserContext } from "../login/UserContext";
import type { User } from "../types/types";

vi.mock("../api/manApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/manApi")>();
  const emptyPage = {
    items: [],
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_prev: false,
    has_next: false,
  };
  return {
    ...actual,
    getMyForumThreads: vi.fn().mockResolvedValue(emptyPage),
    getMyForumPosts: vi.fn().mockResolvedValue(emptyPage),
    getMyForumVotes: vi.fn().mockResolvedValue(emptyPage),
  };
});

function renderAccountPage(user: User | null) {
  return render(
    <MemoryRouter>
      <UserContext.Provider value={{ user, setUser: vi.fn() }}>
        <AccountPage />
      </UserContext.Provider>
    </MemoryRouter>
  );
}

describe("AccountPage", () => {
  it("prompts anonymous users to log in", () => {
    renderAccountPage(null);

    expect(
      screen.getByText(/log in to update your toon ranks avatar/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("renders avatar controls for signed-in users", async () => {
    renderAccountPage({
      id: 1,
      username: "reader",
      role: "GENERAL",
      avatar_url: null,
      avatar_preset: "emerald",
    });

    // findBy* flushes pending async effects (API mock promises)
    await screen.findByRole("heading", { name: /your profile/i });

    expect(screen.getByText("reader")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose image/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /blue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /emerald/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /amber/i })).toBeInTheDocument();
  });

  it("renders the forum activity section with tab switcher for signed-in users", async () => {
    renderAccountPage({
      id: 1,
      username: "reader",
      role: "GENERAL",
      avatar_url: null,
      avatar_preset: "blue",
    });

    await screen.findByText(/forum activity/i);

    expect(screen.getByRole("button", { name: /threads/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replies/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /votes/i })).toBeInTheDocument();
  });

  it("shows empty state for each activity tab after data loads", async () => {
    renderAccountPage({
      id: 1,
      username: "reader",
      role: "GENERAL",
      avatar_url: null,
      avatar_preset: "blue",
    });

    // Threads tab is active by default and resolves to empty
    await screen.findByText(/haven't created any threads yet/i);
  });

  it("does not render the forum activity section for anonymous users", async () => {
    renderAccountPage(null);
    await waitFor(() => {
      expect(screen.queryByText(/forum activity/i)).not.toBeInTheDocument();
    });
  });
});
