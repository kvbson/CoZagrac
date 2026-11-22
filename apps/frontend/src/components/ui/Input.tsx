type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** validation message under the input; also turns the border red */
  error?: string;
  /** red border without a message (pure visual state) */
  invalid?: boolean;
};

export function Input({ label, error, invalid, ...props }: InputProps) {
  const showError = invalid || error !== undefined;

  return (
    <div>
      {label && <label>{label}</label>}
      <input {...props} className={showError ? 'input-invalid' : props.className} />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
