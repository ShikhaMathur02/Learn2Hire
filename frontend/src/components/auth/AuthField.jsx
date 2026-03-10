function AuthField({ label, htmlFor, error, children, hint }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

export default AuthField;
