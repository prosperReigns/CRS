function Button({ children, type = "button", className = "", ...props }) {
  return (
    <button
      type={type}
      className={`rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
