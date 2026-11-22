type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  /** red border on the input (validation state) */
  invalid?: boolean;
};

export function Input({ label, error, invalid, ...props }: InputProps) {
  return (
    <div>
      {label && <label>{label}</label>}
      <input {...props} className={invalid ? 'input-invalid' : props.className} />
      {error && <span>{error}</span>}
    </div>
  );
}
