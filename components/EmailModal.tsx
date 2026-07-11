'use client'

import { useEffect, useState } from 'react'

interface Props {
  onSubmit: (email: string) => void | Promise<void>
  onSkip: () => void
  onClose: () => void
}

// Pragmatic email check — enough to catch typos, not a full RFC validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailModal({ onSubmit, onSkip, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const submit = async () => {
    if (busy) return
    if (!EMAIL_RE.test(email.trim())) {
      setError(true)
      return
    }
    setBusy(true)
    await onSubmit(email.trim())
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">
          Before you vote —
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Drop your email so your likes are saved across devices and we don&apos;t
          count you twice. No spam, no account — just a way to keep votes honest.
          I&apos;ll share the results with everyone who participates.
        </p>

        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="your@email.com"
          className={`mt-5 w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none ${
            error
              ? 'border-rose-400 focus:border-rose-400'
              : 'border-neutral-200 focus:border-neutral-400'
          }`}
        />
        {error && (
          <p className="mt-1.5 text-xs text-rose-500">
            That doesn&apos;t look like an email address.
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : "Let's go →"}
        </button>

        <button
          onClick={onSkip}
          disabled={busy}
          className="mx-auto mt-3 block text-xs text-neutral-400 underline-offset-2 transition hover:text-neutral-600 hover:underline disabled:opacity-60"
        >
          skip (votes won&apos;t be saved across devices)
        </button>
      </div>
    </div>
  )
}
