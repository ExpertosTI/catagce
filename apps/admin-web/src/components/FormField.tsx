type Props = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

export function FormField({ label, children, hint }: Props) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {children}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}
