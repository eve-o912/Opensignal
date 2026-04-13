interface Props { eyebrow: string; title: string; sub: string }

export default function SectionHeader({ eyebrow, title, sub }: Props) {
  return (
    <div className="mb-7">
      <p className="text-xs tracking-widest uppercase text-blue-400 mb-1.5">{eyebrow}</p>
      <h2 className="text-xl font-semibold text-blue-900 mb-1">{title}</h2>
      <p className="text-sm text-blue-400 leading-relaxed">{sub}</p>
    </div>
  )
}
