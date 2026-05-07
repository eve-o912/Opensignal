import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, Props>(({ label, hint, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold text-white tracking-wide">{label}</label>}
    <input
      ref={ref}
      className={`w-full px-3.5 py-2.5 border border-gray-600 rounded-xl text-sm bg-gray-800 text-white outline-none transition-all focus:border-white focus:ring-2 focus:ring-gray-600 placeholder:text-gray-500 ${className}`}
      {...props}
    />
    {hint && <p className="text-xs text-gray-400 leading-snug">{hint}</p>}
  </div>
))
Input.displayName = 'Input'
export default Input
