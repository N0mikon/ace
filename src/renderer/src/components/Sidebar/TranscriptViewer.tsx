import { useState, useEffect, useRef, useCallback } from 'react'
import type { SessionRecord } from '../../../../preload/index.d'
import './TranscriptViewer.css'

interface TranscriptViewerProps {
  sessionId: number | null
  onClose: () => void
}

export function TranscriptViewer({ sessionId, onClose }: TranscriptViewerProps): JSX.Element | null {
  const [session, setSession] = useState<SessionRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const contentRef = useRef<HTMLPreElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle Escape key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (sessionId !== null) {
      loadSession(sessionId)
      document.addEventListener('keydown', handleKeyDown)
      // Focus the modal for keyboard accessibility
      modalRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [sessionId, handleKeyDown])

  const loadSession = async (id: number): Promise<void> => {
    setIsLoading(true)
    const data = await window.session?.get(id)
    setSession(data)
    setIsLoading(false)
  }

  const handleCopyTranscript = async (): Promise<void> => {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.transcript)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyForReview = async (): Promise<void> => {
    if (!session) return

    // Format transcript for AI review with context
    const reviewFormat = `# Session Transcript for Review

**Project:** ${session.projectPath}
**Date:** ${new Date(session.startTime).toLocaleString()}
**Duration:** ${formatDuration(session.duration)}
**Lines:** ${session.lineCount}

---

## Transcript

\`\`\`
${session.transcript}
\`\`\`

---

Please review this session and provide feedback on:
1. What was accomplished
2. Any issues or errors encountered
3. Suggestions for improvement
`

    try {
      await navigator.clipboard.writeText(reviewFormat)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleExport = async (): Promise<void> => {
    if (!sessionId) return
    const result = await window.session?.export(sessionId)
    if (result?.success && result.filepath) {
      console.log('Exported to:', result.filepath)
    }
  }

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return 'Active'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString()
  }

  if (sessionId === null) return null

  return (
    <div className="transcript-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="transcript-modal"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
        aria-labelledby="transcript-title"
      >
        <div className="transcript-header">
          <h3 id="transcript-title">Session Transcript</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {isLoading ? (
          <div className="transcript-loading">Loading session...</div>
        ) : session ? (
          <>
            <div className="transcript-meta">
              <div className="meta-item">
                <span className="meta-label">Date:</span>
                <span className="meta-value">{formatDate(session.startTime)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Duration:</span>
                <span className="meta-value">{formatDuration(session.duration)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Lines:</span>
                <span className="meta-value">{session.lineCount}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Shell:</span>
                <span className="meta-value">{session.shell}</span>
              </div>
            </div>

            <div className="transcript-actions">
              <button
                className={`action-btn ${copySuccess ? 'success' : ''}`}
                onClick={handleCopyTranscript}
                title="Copy raw transcript"
              >
                {copySuccess ? 'Copied!' : 'Copy Transcript'}
              </button>
              <button
                className={`action-btn primary ${copySuccess ? 'success' : ''}`}
                onClick={handleCopyForReview}
                title="Copy formatted for AI review"
              >
                {copySuccess ? 'Copied!' : 'Copy for AI Review'}
              </button>
              <button
                className="action-btn"
                onClick={handleExport}
                title="Export to markdown file"
              >
                Export .md
              </button>
            </div>

            <div className="transcript-content">
              <pre ref={contentRef}>{session.transcript || '(empty session)'}</pre>
            </div>
          </>
        ) : (
          <div className="transcript-error">Session not found</div>
        )}
      </div>
    </div>
  )
}

export default TranscriptViewer
