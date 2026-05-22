import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";

const CheckYourEmailPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="dark-theme-shell flex min-h-screen items-center justify-center px-4 py-10">
      <NoIndexSeo title={`Check Your Email | ${SITE_NAME}`} />
      <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white/92 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.14)] dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(30,24,20,0.98),_rgba(21,17,14,0.98))]">
        <MailCheck size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-stone-50">
          Check Your Email
        </h2>
        <p className="mb-3 text-slate-700 dark:text-stone-300">
          We've sent a verification link to your email address.
        </p>
        <p className="mb-6 text-sm text-slate-600 dark:text-stone-400">
          If you don't see it in your inbox, check your <strong>Spam</strong> or{" "}
          <strong>Promotions</strong> folder. If it is there, mark it as{" "}
          <strong>Not Spam</strong> before opening the link.
        </p>
        <p className="text-xs text-slate-400 dark:text-stone-500">
          Redirecting to login in 10 seconds...
        </p>
      </div>
    </div>
  );
};

export default CheckYourEmailPage;
