type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
};

export function Input({
  label,
  error,
  wrapperClassName,
  inputClassName,
  labelClassName,
  errorClassName,
  ...props
}: InputProps) {
  return (
    <div className={wrapperClassName}>
      {label && <label className={labelClassName}>{label}</label>}
      <input className={inputClassName} {...props} />
      {error && <span className={errorClassName}>{error}</span>}
    </div>
  );
}
