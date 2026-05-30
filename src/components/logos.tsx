import Image from 'next/image'

export function ConnectDigitalLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-connect.jpeg"
      alt="Connect Digital"
      width={size}
      height={size}
      className={`object-contain rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function LíderLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-lider.png"
      alt="Desentupidora Líder"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function LíderIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-lider.png"
      alt="Líder"
      width={size}
      height={size}
      className={`object-contain rounded-xl ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
