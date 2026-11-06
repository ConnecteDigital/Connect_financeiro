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

// Gera o arquivo PDF (A4, quebra em páginas se precisar) ou PNG da folha.
export async function sheetFile(el: HTMLElement, fileBase: string, kind: 'pdf' | 'png'): Promise<File> {
  const canvas = await buildSheetCanvas(el)
  let blob: Blob
  if (kind === 'png') {
    const b: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
    if (!b) throw new Error('Falha ao gerar imagem')
    blob = b
  } else {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    // Fatia o canvas em pedaços da altura de uma página
    const sliceH = Math.floor(canvas.width * pageH / pageW)
    for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
      const h = Math.min(sliceH, canvas.height - y)
      if (page > 0 && h < 40) break // sobra em branco
      const part = document.createElement('canvas')
      part.width = canvas.width
      part.height = h
      part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
      if (page > 0) pdf.addPage()
      pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, h * pageW / canvas.width)
    }
    blob = pdf.output('blob')
  }
  return new File([blob], `${fileBase}.${kind}`, { type: kind === 'pdf' ? 'application/pdf' : 'image/png' })
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url; a.download = file.name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Envia um arquivo JÁ GERADO. Tem que ser chamado direto no toque do
// botão (sem nada demorado antes): o celular só deixa abrir o
// "compartilhar" logo depois de um toque. Se não der, baixa o arquivo.
export async function shareFile(file: File, title: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === 'AbortError') return
    }
  }
  downloadFile(file)
}
