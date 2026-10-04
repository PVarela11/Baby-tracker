import { History } from 'lucide-react'

export function PastLogButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 items-center justify-center gap-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      <History className="size-4" aria-hidden />
      {label}
    </button>
  )
}
