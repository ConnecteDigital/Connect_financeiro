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
