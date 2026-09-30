import Image from "next/image"

const ComingSoonBanner = () => {
  return (
    <div className="content-container py-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--ps-line)] aspect-square max-w-xl mx-auto">
        <Image
          src="/banners/coming-soon.png"
          alt="PS PORT - Coming Soon"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  )
}

export default ComingSoonBanner
