export function stripTelegramFormatting(input: string | null | undefined): string {
  if (!input) {
    return ''
  }

  let text = input

  // Convert markdown-style hyperlinks to "text (url)" so links remain visible
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1 ($2)')

  // Remove bold/italic/strikethrough markers (**text**, __text__, ~~text~~, _text_)
  text = text.replace(/\*\*(.*?)\*\*/g, '$1')
  text = text.replace(/__(.*?)__/g, '$1')
  text = text.replace(/~~(.*?)~~/g, '$1')
  text = text.replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1$2')

  // Remove inline code/backtick wrappers
  text = text.replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')

  // Remove zero-width spaces and collapse extra whitespace introduced by replacements
  text = text.replace(/\u200b/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
