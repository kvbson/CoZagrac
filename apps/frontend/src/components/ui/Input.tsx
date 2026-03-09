type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, ...props }: InputProps) {
  return (
    <div>
      {label && <label>{label}</label>}
      <input {...props} />
      {error && <span>{error}</span>}
    </div>
  );
}
