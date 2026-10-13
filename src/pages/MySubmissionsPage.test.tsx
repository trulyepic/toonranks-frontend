import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingSeries } from "../api/manApi";
import { UserContext } from "../login/UserContext";
import type { User } from "../types/types";
import MySubmissionsPage from "./MySubmissionsPage";

const { getMySubmittedSeries, removeMyApprovedSubmissions } = vi.hoisted(() => ({
  getMySubmittedSeries: vi.fn(),
  removeMyApprovedSubmissions: vi.fn(),
}));

vi.mock("../api/manApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/manApi")>();
  return {
    ...actual,
    getMySubmittedSeries,
    removeMyApprovedSubmissions,
  };
});

const submissions: PendingSeries[] = [
  {
    id: 11,
    title: "Approved title",
    genre: "Action",
    type: "MANHWA",
    cover_url: "https://example.com/approved.jpg",
    vote_count: 0,
    approval_status: "APPROVED",
    approved_at: "2026-10-10T12:00:00Z",
    detail_ready: true,
  },
  {
    id: 12,
    title: "Pending title",
    genre: "Fantasy",
    type: "MANGA",
    cover_url: "https://example.com/pending.jpg",
    vote_count: 0,
    approval_status: "PENDING",
    detail_ready: true,
  },
];

function renderPage(user: User) {
  return render(
    <MemoryRouter>
      <UserContext.Provider value={{ user, authReady: true, setUser: vi.fn() }}>
        <MySubmissionsPage />
      </UserContext.Provider>
    </MemoryRouter>
  );
}

describe("MySubmissionsPage approved history removal", () => {
  beforeEach(() => {
    getMySubmittedSeries.mockReset().mockResolvedValue(submissions);
    removeMyApprovedSubmissions.mockReset().mockResolvedValue([11]);
  });

  it("shows removal controls only for an admin's approved titles", async () => {
    renderPage({ id: 1, username: "admin", role: "ADMIN" });

    const approvedCard = (await screen.findByText("Approved title")).closest(
      "article"
    );
    const pendingCard = screen.getByText("Pending title").closest("article");

    expect(approvedCard).not.toBeNull();
    expect(pendingCard).not.toBeNull();
    expect(
      within(approvedCard as HTMLElement).getByRole("button", { name: "Remove" })
    ).toBeInTheDocument();
    expect(
      within(approvedCard as HTMLElement).getByRole("checkbox", {
        name: "Select Approved title",
      })
    ).toBeInTheDocument();
    expect(
      within(pendingCard as HTMLElement).queryByRole("button", { name: "Remove" })
    ).not.toBeInTheDocument();
    expect(
      within(pendingCard as HTMLElement).queryByRole("checkbox")
    ).not.toBeInTheDocument();
  });

  it("batch-removes selected approved titles from submission history", async () => {
    const user = userEvent.setup();
    renderPage({ id: 1, username: "admin", role: "ADMIN" });

    await user.click(
      await screen.findByRole("checkbox", { name: "Select Approved title" })
    );
    await user.click(
      screen.getByRole("button", { name: "Remove selected (1)" })
    );
    await user.click(
      screen.getByRole("button", { name: "Remove title" })
    );

    await waitFor(() => {
      expect(removeMyApprovedSubmissions).toHaveBeenCalledWith([11]);
    });
    expect(screen.queryByText("Approved title")).not.toBeInTheDocument();
    expect(screen.getByText("Pending title")).toBeInTheDocument();
  });

  it("does not show removal controls to contributors", async () => {
    renderPage({ id: 2, username: "contributor", role: "CONTRIBUTOR" });

    await screen.findByText("Approved title");
    expect(screen.queryByText(/select all approved/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
