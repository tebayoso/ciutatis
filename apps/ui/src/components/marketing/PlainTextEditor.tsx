import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { FileText, Code, SwitchCamera } from 'lucide-react'

export interface PlainTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  mode: 'rich' | 'plain'
  onModeChange: (mode: 'rich' | 'plain') => void
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function autoLinkUrls(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g
  return text.replace(urlRegex, (url) => {
    const href = url.startsWith('www.') ? `https://${url}` : url
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`
  })
}

export function htmlToPlainText(html: string): string {
  if (!html) return ''

  const temp = document.createElement('div')
  temp.innerHTML = html

  const links = temp.querySelectorAll('a')
  links.forEach((link) => {
    const href = link.getAttribute('href')
    const text = link.textContent || ''
    if (href && text !== href) {
      link.textContent = `${text} (${href})`
    }
  })

  const blockElements = temp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote')
  blockElements.forEach((el) => {
    el.appendChild(document.createTextNode('\n'))
  })

  const brs = temp.querySelectorAll('br')
  brs.forEach((br) => {
    br.replaceWith(document.createTextNode('\n'))
  })

  let text = temp.textContent || ''
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

export function plainTextToHtml(text: string): string {
  if (!text) return ''

  let html = escapeHtml(text)
  const paragraphs = html.split(/\n\n+/)

  const processedParagraphs = paragraphs.map((paragraph) => {
    const withLineBreaks = paragraph.replace(/\n/g, '<br>')
    const withLinks = autoLinkUrls(withLineBreaks)
    return withLinks
  })

  if (processedParagraphs.length === 1 && !text.includes('\n')) {
    return processedParagraphs[0]
  }

  return processedParagraphs.map((p) => `<p>${p}</p>`).join('')
}

export function PlainTextEditor({
  value,
  onChange,
  placeholder = 'Enter your content...',
  disabled = false,
  className,
  mode,
  onModeChange,
}: PlainTextEditorProps) {
  const [plainTextValue, setPlainTextValue] = useState('')

  // Sync plain text value when mode changes or HTML value changes externally
  useEffect(() => {
    if (mode === 'plain') {
      setPlainTextValue(htmlToPlainText(value))
    }
  }, [mode, value])

  // Handle plain text changes
  const handlePlainTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newPlainText = e.target.value
      setPlainTextValue(newPlainText)

      // Convert to HTML and notify parent
      const html = plainTextToHtml(newPlainText)
      onChange(html)
    },
    [onChange]
  )

  // Handle mode toggle to plain
  const handleSwitchToPlain = useCallback(() => {
    setPlainTextValue(htmlToPlainText(value))
    onModeChange('plain')
  }, [value, onModeChange])

  // Handle mode toggle to rich
  const handleSwitchToRich = useCallback(() => {
    // Convert current plain text to HTML and notify
    const html = plainTextToHtml(plainTextValue)
    onChange(html)
    onModeChange('rich')
  }, [plainTextValue, onChange, onModeChange])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Edit Mode:</span>
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={handleSwitchToRich}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                mode === 'rich'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Code className="w-4 h-4" />
              Rich
            </button>
            <button
              type="button"
              onClick={handleSwitchToPlain}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                mode === 'plain'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="w-4 h-4" />
              Plain
            </button>
          </div>
        </div>

        {mode === 'plain' && (
          <button
            type="button"
            onClick={handleSwitchToRich}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            Switch to rich text editor
          </button>
        )}
      </div>

      {/* Editor Content */}
      <div
        className={cn(
          'border border-border rounded-lg overflow-hidden',
          'bg-background focus-within:ring-2 focus-within:ring-primary/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {mode === 'plain' ? (
          <textarea
            value={plainTextValue}
            onChange={handlePlainTextChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full min-h-[200px] p-4 resize-y',
              'bg-transparent text-foreground',
              'focus:outline-none',
              'font-mono text-sm leading-relaxed'
            )}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
          />
        ) : (
          <div className="p-4 min-h-[200px]">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: value || `<p class="text-muted-foreground">${placeholder}</p>` }}
            />
            <button
              type="button"
              onClick={handleSwitchToPlain}
              disabled={disabled}
              className="mt-4 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              Switch to plain text editor
            </button>
          </div>
        )}
      </div>

      {/* Helper text */}
      {mode === 'plain' && (
        <p className="text-xs text-muted-foreground">
          URLs will be automatically linked. Use double line breaks to create paragraphs.
        </p>
      )}
    </div>
  )
}
