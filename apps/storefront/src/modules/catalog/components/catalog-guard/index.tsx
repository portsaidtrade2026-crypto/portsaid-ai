"use client"

// Lightweight, honest deterrent against casual right-click-save/drag on the
// full-catalog page - not real DRM (nothing client-side can be), just makes
// grabbing images a deliberate extra step instead of one click.
export default function CatalogGuard({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className="select-none [&_img]:pointer-events-none"
    >
      {children}
    </div>
  )
}
