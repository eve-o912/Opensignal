import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, Props>(({ label, hint, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold text-blue-900 tracking-wide">{label}</label>}
    <input
      ref={ref}
      className={`w-full px-3.5 py-2.5 border border-blue-200 rounded-xl text-sm bg-white text-blue-900 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100 placeholder:text-blue-300 ${className}`}
      {...props}
    />
    {hint && <p className="text-xs text-blue-400 leading-snug">{hint}</p>}
  </div>
))
Input.displayName = 'Input'
export default Input
