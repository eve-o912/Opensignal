import { TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export default function Textarea({ label, hint, className = '', ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-blue-900 tracking-wide">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2.5 border border-blue-200 rounded-xl text-xs font-mono bg-white text-blue-900 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100 resize-y min-h-20 placeholder:text-blue-300 ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-blue-400 leading-snug">{hint}</p>}
    </div>
  )
}
