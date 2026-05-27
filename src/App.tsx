import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SeriesDetailPage from "./pages/SeriesDetailPage";
import FilteredSeriesPage from "./pages/FilteredSeriesPage";
import { SearchProvider } from "./components/SearchContext";
import Footer from "./components/Footer";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import CheckYourEmailPage from "./pages/CheckYourEmailPage";
import RankingsInfoPage from "./pages/RankingsInfoPage";
import ComparePage from "./pages/ComparePage";
import MyReadingListsPage from "./pages/MyReadingListsPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import IssuesPage from "./pages/IssuesPage";
import ForumPage from "./pages/ForumPage";
import ThreadPage from "./pages/ThreadPage";
import PublicReadingListPage from "./pages/PublicReadingListPage";
import PendingTitlesPage from "./pages/PendingTitlesPage";
import MySubmissionsPage from "./pages/MySubmissionsPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import AccountPage from "./pages/AccountPage";
import UserProfilePage from "./pages/UserProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import { useEffect, useState } from "react";
import { SessionExpiredModal } from "./components/SessionExpiredModal";

function App() {
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    const flag = localStorage.getItem("sessionExpired");
    if (flag) {
      localStorage.removeItem("sessionExpired");
      setShowExpired(true);
    }
  }, []);
  return (
    <SearchProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_18%,_#ffffff_100%)] transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.04),_transparent_18%),linear-gradient(180deg,_#18120f_0%,_#120f0d_18%,_#171210_100%)]">
            <>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/series/:id" element={<SeriesDetailPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route
                  path="/check-your-email"
                  element={<CheckYourEmailPage />}
                />
                <Route
                  path="/type/:seriesType"
                  element={<FilteredSeriesPage />}
                />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route
                  path="/how-rankings-work"
                  element={<RankingsInfoPage />}
                />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/user/:username" element={<UserProfilePage />} />
                <Route path="/my-lists" element={<MyReadingListsPage />} />
                <Route path="/my-submissions" element={<MySubmissionsPage />} />
                <Route path="/pending-titles" element={<PendingTitlesPage />} />
                <Route path="/issues" element={<IssuesPage />} />
                <Route path="/report-issue" element={<ReportIssuePage />} />

                <Route path="/forum" element={<ForumPage />} />
                <Route path="/forum/:id" element={<ThreadPage />} />
                <Route
                  path="/lists/:token"
                  element={<PublicReadingListPage />}
                />

                {/* Catch-all — must be last */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <SessionExpiredModal
                open={showExpired}
                onConfirm={() => {
                  setShowExpired(false);
                }}
              />
            </>
          </main>
          <Footer />
        </div>
      </Router>
    </SearchProvider>
  );
}

export default App;
