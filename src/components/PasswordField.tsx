import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
  autoComplete?: string;
};

const PasswordField = ({
  value,
  onChange,
  placeholder,
  className,
  autoComplete,
}: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((next) => !next)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#2a221c] dark:hover:text-slate-200"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordField;
