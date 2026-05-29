import * as React from "react"

interface VidPalLogoProps {
  className?: string
}

export function VidPalLogo({ className }: VidPalLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VidPal"
    >
      <g fill="currentColor">
        {/* Center solid core */}
        <circle cx="50" cy="50" r="5" />
        {/* Ring 1: 6 dots, close */}
        <circle cx="50" cy="33" r="3.5" />
        <circle cx="64.7" cy="41.5" r="3.5" />
        <circle cx="64.7" cy="58.5" r="3.5" />
        <circle cx="50" cy="67" r="3.5" />
        <circle cx="35.3" cy="58.5" r="3.5" />
        <circle cx="35.3" cy="41.5" r="3.5" />
        {/* Ring 2: 12 dots, medium */}
        <circle cx="50" cy="22" r="2.5" />
        <circle cx="64.1" cy="25.9" r="2.5" />
        <circle cx="73.1" cy="35.9" r="2.5" />
        <circle cx="77" cy="50" r="2.5" />
        <circle cx="73.1" cy="64.1" r="2.5" />
        <circle cx="64.1" cy="74.1" r="2.5" />
        <circle cx="50" cy="78" r="2.5" />
        <circle cx="35.9" cy="74.1" r="2.5" />
        <circle cx="26.9" cy="64.1" r="2.5" />
        <circle cx="23" cy="50" r="2.5" />
        <circle cx="26.9" cy="35.9" r="2.5" />
        <circle cx="35.9" cy="25.9" r="2.5" />
        {/* Ring 3: sparse outer, fading */}
        <circle cx="50" cy="15" r="1.5" opacity="0.35" />
        <circle cx="68.8" cy="21.6" r="1.5" opacity="0.35" />
        <circle cx="80.3" cy="32.5" r="1.5" opacity="0.35" />
        <circle cx="85" cy="50" r="1.5" opacity="0.35" />
        <circle cx="80.3" cy="67.5" r="1.5" opacity="0.35" />
        <circle cx="68.8" cy="78.4" r="1.5" opacity="0.35" />
        <circle cx="50" cy="85" r="1.5" opacity="0.35" />
        <circle cx="31.2" cy="78.4" r="1.5" opacity="0.35" />
        <circle cx="19.7" cy="67.5" r="1.5" opacity="0.35" />
        <circle cx="15" cy="50" r="1.5" opacity="0.35" />
        <circle cx="19.7" cy="32.5" r="1.5" opacity="0.35" />
        <circle cx="31.2" cy="21.6" r="1.5" opacity="0.35" />
      </g>
    </svg>
  )
}
