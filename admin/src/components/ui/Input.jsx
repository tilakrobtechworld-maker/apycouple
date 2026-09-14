import React, { forwardRef } from 'react';

/**
 * Input — admin form input field.
 *
 * Props:
 *  label        string?
 *  error        string?  — validation error message
 *  hint         string?  — helper text below input
 *  leftIcon     ReactNode?
 *  rightIcon    ReactNode?
 *  type         string    — defaults to 'text'
 *  required     bool?
 *  ...rest      — forwarded to <input>
 */
const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, rightIcon, required, className = '', type = 'text', ...rest },
  ref
) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={[
            'admin-input',
            leftIcon ? 'pl-9' : '',
            rightIcon ? 'pr-9' : '',
            error ? 'admin-input-error' : '',
          ].join(' ')}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export default Input;
