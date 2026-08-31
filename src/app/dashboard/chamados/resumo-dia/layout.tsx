export default function ResumoDiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: 'white', fontFamily: 'Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
