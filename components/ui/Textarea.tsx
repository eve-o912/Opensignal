import { TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export default function Textarea({ label, hint, className = '', ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-white tracking-wide">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2.5 border border-gray-600 rounded-xl text-xs font-mono bg-gray-800 text-white outline-none transition-all focus:border-white focus:ring-2 focus:ring-gray-600 resize-y min-h-20 placeholder:text-gray-500 ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-gray-400 leading-snug">{hint}</p>}
    </div>
  )
}
