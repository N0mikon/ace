import { useState, useEffect, useCallback } from 'react'
import type { SessionMeta } from '../../../../preload/index.d'
import { TranscriptViewer } from './TranscriptViewer'
import './SessionPanel.css'

export function SessionPanel(): JSX.Element {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingSessionId, setViewingSessionId] = useState<number | null>(null)

  useEffect(() => {
    loadSessions()
    loadCurrentSession()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchSessions(searchQuery)
      } else {
        loadSessions()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadSessions = async (): Promise<void> => {
    setIsLoading(true)
    const data = await window.session?.list(10)
    setSessions(data || [])
    setIsLoading(false)
  }

  const searchSessions = async (query: string): Promise<void> => {
    setIsLoading(true)
    const data = await window.session?.search(query, 10)
    setSessions(data || [])
    setIsLoading(false)
  }

  const loadCurrentSession = async (): Promise<void> => {
    const result = await window.session?.current()
    setCurrentSessionId(result?.sessionId || null)
  }

  const handleExport = async (sessionId: number, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const result = await window.session?.export(sessionId)
    if (result?.success) {
      console.log('Session exported to:', result.filepath)
    }
  }

  const handleDelete = async (sessionId: number, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (confirm('Delete this session? This cannot be undone.')) {
      await window.session?.delete(sessionId)
      loadSessions()
    }
  }

  const handleViewSession = useCallback((sessionId: number): void => {
    setViewingSessionId(sessionId)
  }, [])

  const handleCloseViewer = useCallback((): void => {
    setViewingSessionId(null)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value)
  }

  const handleClearSearch = (): void => {
    setSearchQuery('')
  }

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return 'Active'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <>
      <div className="session-panel">
        <div className="panel-header">
          <span className="panel-title">Sessions</span>
          <button className="refresh-button" onClick={loadSessions} title="Refresh">
            &#8635;
          </button>
        </div>

        <div className="session-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button className="clear-search" onClick={handleClearSearch} title="Clear search">
              &times;
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="session-loading">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="session-empty">
            {searchQuery ? 'No matching sessions' : 'No sessions yet'}
          </div>
        ) : (
          <div className="session-list" role="list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => handleViewSession(session.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleViewSession(session.id)
                  }
                }}
                role="listitem"
                tabIndex={0}
                aria-label={`Session from ${formatDate(session.startTime)}, ${session.lineCount} lines`}
              >
                <div className="session-info">
                  <span className="session-date">{formatDate(session.startTime)}</span>
                  <span className="session-duration">{formatDuration(session.duration)}</span>
                </div>
                <div className="session-meta">
                  <span className="session-lines">{session.lineCount} lines</span>
                </div>
                <div className="session-actions">
                  <button
                    className="action-button"
                    onClick={(e) => handleExport(session.id, e)}
                    title="Export to Markdown"
                  >
                    &#128190;
                  </button>
                  <button
                    className="action-button delete"
                    onClick={(e) => handleDelete(session.id, e)}
                    title="Delete"
                  >
                    &#128465;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TranscriptViewer sessionId={viewingSessionId} onClose={handleCloseViewer} />
    </>
  )
}

export default SessionPanel
