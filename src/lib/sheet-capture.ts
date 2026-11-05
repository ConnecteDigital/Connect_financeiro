// Captura de uma folha (OS / certificado) em canvas.
//
// • Usa o html2canvas-pro: o html2canvas original desenha o texto alguns
//   pixels abaixo do lugar (o texto "atravessa" linhas e bordas).
// • fixedWidth: a cópia capturada é diagramada nessa largura, não na da
//   tela — sem isso, no celular a folha sai espremida e o cabeçalho corta
//   o texto da direita.
export async function buildSheetCanvas(el: HTMLElement, opts: { fixedWidth?: number } = {}) {
  const html2canvas = (await import('html2canvas-pro')).default
  if (document.fonts?.ready) await document.fonts.ready
  const width = opts.fixedWidth
  return html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    ...(width ? { windowWidth: width + 40 } : {}),
    onclone: (_doc, clone) => {
      if (width) {
        clone.style.width = `${width}px`
        clone.style.maxWidth = 'none'
      }
    },
  })
}
