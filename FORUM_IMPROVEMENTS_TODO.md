# Forum Improvements TODO — Frontend

This roadmap covers every frontend change required to bring the Toon Ranks forum up to the standard
of popular modern forums (Reddit, Discourse, phpBB). The backend companion doc is at
`toonranks-backend/FORUM_IMPROVEMENTS_TODO.md`. Features are grouped by complexity and dependency.

---

## Current Frontend State

**Stack:** React 18 + Vite + TypeScript. Deployed to AWS Amplify.

**Relevant files:**
- Forum thread list: `src/pages/ForumPage.tsx`
- Forum thread view: `src/pages/ThreadPage.tsx`
- API functions: `src/api/manApi.ts`
- Toast: `react-hot-toast` (`toast.success`, `toast.error`)
- Auth context: check the existing `useUser` / `saveUser` pattern used in `AccountPage.tsx`

**Current component summary:**

| Component/Page | Responsibility |
|---|---|
| `ForumPage.tsx` | Thread list with pagination, search input (`?q=`), create/edit/delete thread modal, series @-mention picker, ranker badges, client-side "pinned" hack for Patch Notes title |
| `ThreadPage.tsx` | Thread view with paginated posts, nested `ReplyBranch` component, `RichReplyEditor`, vote controls, edit/delete for owners/admins, lock/latest-first admin controls, markdown rendering via `react-markdown` + `rehype-raw` + `rehype-sanitize`, SEO JSON-LD |

**API functions currently in `src/api/manApi.ts`:**

| Function | Endpoint |
|---|---|
| `fetchThreadsPaged(params)` | `GET /forum/threads-paged` |
| `createThread(payload)` | `POST /forum/threads` |
| `updateThread(id, payload)` | `PATCH /forum/threads/{id}` |
| `deleteThread(id)` | `DELETE /forum/threads/{id}` |
| `fetchThreadDetail(id, page)` | `GET /forum/threads/{id}/posts-paged` |
| `createPost(threadId, payload)` | `POST /forum/threads/{id}/posts` |
| `updatePost(threadId, postId, payload)` | `PATCH /forum/threads/{id}/posts/{postId}` |
| `deletePost(threadId, postId)` | `DELETE /forum/threads/{id}/posts/{postId}` |
| `setPostVote(threadId, postId, vote)` | `POST /forum/threads/{id}/posts/{postId}/vote` |
| `lockThread(threadId, locked)` | `PATCH /forum/threads/{id}/lock` |
| `updateThreadSettings(threadId, settings)` | `PATCH /forum/threads/{id}/settings` |
| `searchForumSeries(q)` | `GET /forum/series-search` |
| `uploadForumMedia(threadId, file)` | `POST /forum/media/upload` |

---

## ✅ Phase 1: Quick Wins — Frontend-Only Changes (No Backend Work Required)

Suggested branch: `frontend-forum-quick-wins` — **complete, pending merge**

No migration required.

These changes require no backend work. All the data needed already exists in API responses.

### 1a — Edited post indicator

**File:** `src/pages/ThreadPage.tsx`

Every `ForumPostOut` already includes `created_at` and `updated_at`. The post component never
displays `updated_at`. An "(edited)" label should appear whenever `updated_at` is meaningfully
later than `created_at` (allow a 10-second buffer to account for flush timing).

- [x] Created `src/util/dateUtils.ts` with `wasEdited(createdAt, updatedAt): boolean` (10-second buffer)
- [x] `(edited)` label added after timestamp in `ReplyBranch` byline
- [x] `(edited)` label added after timestamp in the OP (posts[0]) byline

### 1b — Character limit counter in the web reply composer

- [x] `MAX_POST_LENGTH = 10_000` constant added to `RichReplyEditor.tsx`
- [x] Live character counter displayed below textarea; turns red when limit exceeded
- [x] Submit button disabled when `value.length > MAX_POST_LENGTH`
- [x] Over-limit guard in `handlePrimary` with a notice modal error

### 1c — Quote-reply button

- [x] "Quote" button added to `ReplyBranch` action row; shown only on unlocked threads
- [x] `handleQuote` in `ThreadPage` builds blockquote markdown with `> **@author** wrote:` attribution
- [x] Bottom editor remounts with quoted content via `key={quoteKey}` + `initial={quoteInitial}`
- [x] `quoteParentId` wired into `createForumPost` so quoted replies thread under the quoted post
- [x] Bottom editor section scrolled into view on quote (`bottomEditorRef`)
- [x] `onQuote` prop propagated down the full `ReplyBranch` tree

### 1d — Draft auto-save

- [x] `RichReplyEditor.tsx`: draft saved to `localStorage` keyed as `forum_draft_thread_${threadId}` (reply mode only); debounced 1 s; restored on mount; cleared on successful post
- [x] "Draft saved" indicator shows briefly after each save
- [x] `NewThreadModal` in `ForumPage.tsx`: title + body saved to `forum_draft_new_thread` (create mode only); debounced 1 s; restored on mount; cleared on successful create

---

## ✅ Phase 2: Thread Sorting UI

Suggested branch: `frontend-forum-sorting` — **complete, pending merge**

**Backend dependency:** Backend Phase 2 already deployed.

**File:** `src/pages/ForumPage.tsx`, `src/api/manApi.ts`

- [x] `sort` option added to `listForumThreadsPaged` opts parameter in `manApi.ts`
- [x] `sortBy` state initialized from `sessionStorage` (defaults to `"activity"`)
- [x] `sort: sortBy` passed to `listForumThreadsPaged` on every load
- [x] Sort control row (3 pill buttons: Active / Newest / Most replies) inserted below search input
- [x] Active sort pill styled with emerald highlight matching existing design system
- [x] On sort change: persists to `sessionStorage`, resets page to 1, re-fetches
- [x] On search query change: also resets to page 1
- [x] `sortBy` included in `useEffect` dependency array

---

## ✅ Phase 3: Rich Text Markdown Toolbar

Suggested branch: `frontend-forum-rich-text` — **complete, pending merge**

- [x] Created `src/components/MarkdownToolbar.tsx` — self-contained, works with any textarea via ref
- [x] Buttons: Bold, Italic, Strikethrough, Link (prompts for URL), Inline code, Code block, Blockquote, Unordered list, Ordered list, Spoiler (`<details>`)
- [x] `wrapSelection`, `prefixLines`, `insert` helpers restore focus and cursor/selection after each action
- [x] Horizontally scrollable on narrow screens (`overflow-x-auto` + `flex` with `shrink-0` buttons)
- [x] Replaces existing B/I buttons in `RichReplyEditor.tsx`; Image/GIF + List buttons remain after it
- [x] Added above first-post textarea in `NewThreadModal` in `ForumPage.tsx`

---

## ✅ Phase 4: Thread Pinning UI

Suggested branch: `frontend-forum-pinning` — **complete, pending merge**

- [x] `is_pinned?: boolean` and `view_count?: number` added to `ForumThread` type in `manApi.ts`
- [x] `setThreadPin(thread_id, pinned)` API function added
- [x] Client-side `promotePatchNotes` hack removed — `PATCH_NOTES_TITLE`, `normalize`, and `promotePatchNotes` all deleted
- [x] Pinned threads get amber left border + warm amber background in thread list
- [x] 📌 icon prefixed to pinned thread titles; "Pinned" amber badge in meta row
- [x] Admin pin/unpin button in thread row actions — optimistic update, reverts on error

---

## ✅ Phase 5: Post Reporting UI

Suggested branch: `frontend-forum-post-reporting` — **complete, pending merge**

- [x] `reportPost(thread_id, post_id, reason?)` added to `manApi.ts`
- [x] ⚑ Report button on each reply — shown only to authenticated users who are not the post author
- [x] Clicking opens an inline rose-tinted form: optional reason textarea (max 500 chars) + Submit + Cancel
- [x] On success: notifies "Report submitted. Our team will review it." and hides form + button
- [x] On 409: notifies "You have already reported this post."
- [x] `reported` state prevents double-reporting within the same session

---

## ✅ Phase 6: Thread Bookmarking UI

Suggested branch: `frontend-forum-bookmarking` — **complete, pending merge**

- [x] `viewer_has_bookmarked` added to `ForumPost` type
- [x] `togglePostBookmark` and `fetchMyBookmarks` API functions added
- [x] 🔖 bookmark button on every reply — amber when saved, outline when not; optimistic toggle with revert on error
- [x] "Saved" tab added to `ForumActivitySection` — lazy loads on first open; shows excerpt, author, date, View link, and ✕ remove button
- [x] Removing from Saved list optimistically removes the row without a page reload

### 6a — API functions

Add to `src/api/manApi.ts`:
```typescript
export interface BookmarkToggleOut {
  bookmarked: boolean;
}

export const togglePostBookmark = async (
  threadId: number,
  postId: number
): Promise<BookmarkToggleOut> => {
  const res = await api.post<BookmarkToggleOut>(
    `/forum/threads/${threadId}/posts/${postId}/bookmark`
  );
  return res.data;
};

export interface ForumBookmarksPage {
  items: ForumPostOut[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
}

export const fetchMyBookmarks = async (page = 1): Promise<ForumBookmarksPage> => {
  const res = await api.get<ForumBookmarksPage>("/forum/me/bookmarks", {
    params: { page, page_size: 20 },
  });
  return res.data;
};
```

### 6b — Bookmark button on posts

- [ ] Update `ForumPostOut` type in `manApi.ts` to include `viewer_has_bookmarked: boolean`.
- [ ] Add a bookmark (🔖) button to the post action row in `ThreadPage.tsx`. Show only to
  authenticated users.
- [ ] Button shows a filled bookmark icon when `viewer_has_bookmarked` is true, outline otherwise.
- [ ] On click: call `togglePostBookmark`, optimistically flip `viewer_has_bookmarked` in the post
  state, revert on error with `toast.error(...)`.

### 6c — Bookmarks section in account page

- [ ] In `src/pages/AccountPage.tsx`, add a "Saved Posts" card.
- [ ] Fetch `fetchMyBookmarks(page)` on mount (only when signed in).
- [ ] Show a paginated list of bookmarked posts, each with: post content excerpt (first 150 chars),
  thread title (linked to `ThreadPage`), post author, and date.
- [ ] A "Remove" (×) button on each row calls `togglePostBookmark` and removes the post from the list.

---

## ✅ Phase 7: Thread Following UI

Suggested branch: `frontend-forum-following` — **complete, pending merge**

- [x] `viewer_is_following` added to `ForumThread` type
- [x] `toggleThreadFollow` and `fetchMyFollowing` API functions added
- [x] Follow/Following button in thread header pill row — emerald when following, outline when not; optimistic toggle with revert on error
- [x] "Following" tab added to `ForumActivitySection` — lazy loads on first open; shows thread title, post count, updated date, ✕ unfollow button

### 7a — API function

Add to `src/api/manApi.ts`:
```typescript
export interface FollowToggleOut {
  following: boolean;
  follower_count: number;
}

export const toggleThreadFollow = async (threadId: number): Promise<FollowToggleOut> => {
  const res = await api.post<FollowToggleOut>(`/forum/threads/${threadId}/follow`);
  return res.data;
};
```

### 7b — Follow button on thread

- [ ] Update `ForumThreadOut` type to include `viewer_is_following: boolean`.
- [ ] Add a "Follow" / "Following" button in the thread header area of `ThreadPage.tsx`, to the
  right of the thread title. Show only to authenticated users.
- [ ] Button label: "Follow this thread" when not following; "✓ Following" when following.
- [ ] On click: call `toggleThreadFollow`, optimistically update `viewer_is_following`, revert on error.
- [ ] Show the follower count next to the button as a muted number.

### 7c — Following list in account page

- [ ] In `src/pages/AccountPage.tsx`, add a "Following" tab or section to the forum activity card.
- [ ] Fetch `GET /forum/me/following` (paginated) and show threads the user follows, each linking
  to `ThreadPage`. An "Unfollow" button on each row calls `toggleThreadFollow`.

---

## ✅ Phase 8: Categories / Subforums UI

Suggested branch: `frontend-forum-categories` — **complete, pending merge**

- [x] `ForumCategory` type + `fetchForumCategories` API function added
- [x] `category_id` / `category_name` added to `ForumThread` type; `category_id` added to `createForumThread` and `listForumThreadsPaged`
- [x] Category pill strip in forum list (All + one pill per category with thread count); shows description when a category is active
- [x] Category badge on each thread row when "All" is selected
- [x] Category selector in new thread modal — pre-selects the active category if one is chosen
- [x] `Forum / Category name` breadcrumb in thread header

**Backend dependency:** Requires backend Phase 5 (categories model, migration, and endpoints) to
be deployed first. Coordinate the migration timing with the backend team before shipping this phase —
the DB migration must run before any frontend category requests are made.

**Files:** `src/pages/ForumPage.tsx`, `src/api/manApi.ts`

### 8a — API functions

Add to `src/api/manApi.ts`:
```typescript
export interface ForumCategoryOut {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  thread_count: number;
}

export const fetchForumCategories = async (): Promise<ForumCategoryOut[]> => {
  const res = await api.get<ForumCategoryOut[]>("/forum/categories");
  return res.data;
};
```

Update `fetchThreadsPaged` to accept `category_slug?: string`:
```typescript
export const fetchThreadsPaged = async (params: {
  q?: string;
  page?: number;
  page_size?: number;
  sort?: "activity" | "newest" | "replies";
  category_slug?: string;  // add this
}) => { ... };
```

Update `createThread` payload type to include `category_id?: number`.

### 8b — Category filter on forum list

- [ ] On mount in `ForumPage.tsx`, fetch `fetchForumCategories()` and cache the result in state.
- [ ] Add a category filter sidebar (desktop) or a horizontal scrolling pill strip (mobile/narrow):
  - "All" pill (no category filter, default active)
  - One pill per category (using `category.name`)
- [ ] Selecting a category sets `activeCategorySlug` state, passes it as `category_slug` to
  `fetchThreadsPaged`, and resets to page 1.
- [ ] Show the category description as a small subtitle when a category is selected.
- [ ] Update the thread list rows to show a small category badge on each thread when "All" is the
  active view (so users can see which category each thread belongs to).

### 8c — Category selector on thread creation

- [ ] In the thread creation modal in `ForumPage.tsx`, add a "Category" dropdown or radio group
  above the title field:
  - Options: all visible categories from the cached `fetchForumCategories()` result
  - Default: pre-select the currently active category if one is selected in the filter
  - Required: do not allow thread creation without selecting a category
- [ ] Pass `category_id: selectedCategoryId` in the `createThread(...)` payload.

### 8d — Category in thread header

- [ ] In `ThreadPage.tsx`, update `ForumThreadOut` type to include
  `category_id: number | null` and `category_name: string | null`.
- [ ] Show the category name as a tappable breadcrumb link in the thread header area:
  `Forum > {category_name} > {thread_title}`
  Clicking the category name navigates back to `ForumPage` with that category pre-selected.

---

## Phase 9: Notification Bell UI

Suggested branch: `frontend-forum-notifications`

**Backend dependency:** Requires backend Phase 6 (notification model, endpoints) to be deployed
first.

**Files:** `src/pages/ForumPage.tsx`, `src/components/` (new component), `src/api/manApi.ts`,
nav component (wherever the top nav bar is defined)

### 9a — API functions

Add to `src/api/manApi.ts`:
```typescript
export interface NotificationOut {
  id: number;
  kind: string; // THREAD_REPLY | POST_MENTION | POST_UPVOTE | THREAD_FOLLOW_REPLY
  is_read: boolean;
  created_at: string;
  thread_id: number | null;
  post_id: number | null;
  actor_username: string | null;
  summary: string | null;
}

export interface NotificationsPage {
  items: NotificationOut[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
  unread_count: number;
}

export const fetchNotifications = async (page = 1): Promise<NotificationsPage> => {
  const res = await api.get<NotificationsPage>("/notifications", { params: { page, page_size: 20 } });
  return res.data;
};

export const fetchUnreadCount = async (): Promise<{ count: number }> => {
  const res = await api.get<{ count: number }>("/notifications/unread-count");
  return res.data;
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post("/notifications/read-all");
};
```

### 9b — Unread count polling

- [ ] When a user is signed in, poll `fetchUnreadCount()` every 60 seconds. Store the count in
  a top-level context or a simple `useState` passed down via props.
  Do not poll when the user is signed out.
- [ ] Alternatively, trigger a re-fetch of `fetchUnreadCount` whenever the page regains focus
  (`window.addEventListener("focus", ...)`) so the count updates when the user returns from
  another tab.

### 9c — Notification bell component

Create `src/components/NotificationBell.tsx`:

- [ ] Show a 🔔 bell icon in the top navigation bar (wherever the user avatar/account link lives).
  Only shown when signed in.
- [ ] When `unreadCount > 0`, show a red badge number overlaid on the bell icon (capped at "99+").
- [ ] Clicking the bell opens a dropdown panel listing the most recent 20 notifications.
- [ ] Each notification row shows:
  - Actor avatar (or a placeholder icon if no avatar)
  - Summary text: e.g. "**cool_reader** replied to your thread"
  - Thread/post link: clicking the row navigates to `ThreadPage` (with `?post={post_id}` anchor
    to scroll to the specific post)
  - Relative timestamp (e.g. "3 hours ago")
  - Unread rows have a distinct background (e.g. faint blue tint)
- [ ] Clicking a notification calls `markNotificationRead(id)` and marks it read in local state.
- [ ] A "Mark all as read" button at the top of the panel calls `markAllNotificationsRead` and
  clears the badge.
- [ ] A "View all" link at the bottom of the panel navigates to a dedicated notifications page
  (or opens the panel in a larger view — a full page is optional in v1).

---

## Phase 10: Read Tracking — "New Posts" Badges

Suggested branch: `frontend-forum-read-tracking`

**Backend dependency:** Requires backend Phase 7 (`ForumReadState` table and `POST /forum/threads/{id}/mark-read`
endpoint) to be deployed first.

**Files:** `src/pages/ForumPage.tsx`, `src/pages/ThreadPage.tsx`, `src/api/manApi.ts`

### 10a — API function

Add to `src/api/manApi.ts`:
```typescript
export const markThreadRead = async (
  threadId: number,
  lastSeenPostId: number
): Promise<void> => {
  await api.post(`/forum/threads/${threadId}/mark-read`, {
    last_seen_post_id: lastSeenPostId,
  });
};
```

### 10b — Update `ForumThreadOut` type

Update the type in `manApi.ts` to include new fields returned from backend Phase 7:
```typescript
export interface ForumThreadOut {
  // ... existing fields ...
  has_unread: boolean;       // true if there are posts after the viewer's last read position
  unread_count: number | null; // how many unread posts
}
```

### 10c — New posts badge on thread list

- [ ] In `ForumPage.tsx`, show a "New" badge or an unread count chip on thread rows where
  `thread.has_unread === true` and the viewer is authenticated:
  - Small green "New" pill next to the thread title, or
  - A `{thread.unread_count} new` chip in the post count area
- [ ] Threads with unread posts should also be visually distinct from fully-read threads (e.g.
  the thread title is bold when unread, normal weight when read — similar to Gmail).

### 10d — Mark thread as read

- [ ] In `ThreadPage.tsx`, after posts finish loading, record the ID of the last visible post:
  ```typescript
  useEffect(() => {
    if (!user || !posts.length) return;
    const lastPostId = posts[posts.length - 1].id;
    markThreadRead(threadId, lastPostId).catch(() => {/* silent fail */});
  }, [posts, threadId, user]);
  ```
  Call `markThreadRead` each time a new page of posts is loaded (the user has seen those posts).
- [ ] Scroll-based tracking (optional enhancement): use an `IntersectionObserver` on the last
  rendered post to only mark the thread as read once the user has actually scrolled to the bottom.
  This is more accurate but optional for v1.

---

## Phase 11: User @-mention Autocomplete in Composer

Suggested branch: `frontend-forum-mention-autocomplete`

**Backend dependency:** Requires backend Phase 6 (notification system must be live so mentions
trigger notifications). The autocomplete itself only needs a user search endpoint — verify that
`GET /users/leaderboard` or a dedicated `GET /users/search?q=` endpoint is available and returns
enough results for autocomplete. If no user search endpoint exists, add
`GET /users/search?q=&limit=10` to the backend first.

**File:** `src/pages/ThreadPage.tsx` — the `RichReplyEditor` and thread creation first-post textarea

### 11a — Mention detection

- [ ] Detect when the user types `@` followed by letters in the composer textarea. Watch for
  this trigger pattern using an `onKeyUp`/`onChange` handler that extracts the current word:
  ```typescript
  function getMentionTrigger(text: string, cursorPos: number): string | null {
    const before = text.slice(0, cursorPos);
    const match = before.match(/@([A-Za-z0-9_-]*)$/);
    return match ? match[1] : null;
  }
  ```

### 11b — Autocomplete dropdown

- [ ] When a mention trigger is detected and the partial username is at least 1 character, fetch
  matching users. Call the user search endpoint (e.g. `GET /users/search?q={partial}&limit=5`).
  Debounce the search by 300ms.
- [ ] Show a dropdown below the textarea with matching usernames and their avatars. Maximum 5 results.
- [ ] Keyboard navigation: arrow keys to move through results, Enter to select, Escape to dismiss.
- [ ] On selection, replace the `@{partial}` in the textarea with `@{selected_username}`.
- [ ] If no user search endpoint is available yet, skip the network call and instead show a plain
  inline note "Type @username to mention a user" as a placeholder hint.

---

## Later / Post-Launch

- [ ] Thread view count: show `view_count` in the thread list (requires backend Phase 1b). Add
  a small "👁 {n}" chip in the thread meta row.
- [ ] Admin category management UI: a dedicated admin page or modal to create, rename, reorder,
  and hide/show categories. Only needed once categories are live.
- [ ] Full-text post search results: update the search UI in `ForumPage.tsx` to add a "Search
  inside posts" toggle (requires backend Phase 8 `?search_posts=true` param).
- [ ] Admin report queue: a dedicated admin page at `/admin/reports` that fetches
  `GET /forum/reports?status=OPEN` and lets admins mark reports as reviewed or dismissed.
- [ ] Pagination state in URL: persist `?page=2` and `?sort=newest` in the URL query string in
  `ForumPage.tsx` so users can share and bookmark paginated/sorted views.
- [ ] Thread move: an admin-only "Move to category" control in the thread header of `ThreadPage.tsx`
  (calls `PATCH /forum/threads/{id}` with `category_id`).
- [ ] Forum home stats bar: a slim stats bar above the thread list showing total thread count,
  total post count, and registered member count (fetch from a lightweight stats endpoint).
