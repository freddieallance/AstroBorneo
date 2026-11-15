import type { AstronautProfile } from '@/game/astronauts';

export function AstronautAvatar({
  profile,
  size = 56,
  className,
}: {
  profile: AstronautProfile;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill="#0d152e" stroke={profile.trimColor} strokeWidth="2.5" />
      {/* Backpack */}
      <rect x="13" y="33" width="38" height="17" rx="7" fill={profile.backpackColor} />
      {/* Suit Torso */}
      <path d="M18 58 C18 43 23 37 32 37 C41 37 46 43 46 58 Z" fill={profile.suitColor} />
      <rect x="26" y="42" width="12" height="7" rx="2.5" fill={profile.trimColor} />
      {/* Helmet */}
      <circle cx="32" cy="24" r="15.5" fill={profile.suitColor} stroke={profile.trimColor} strokeWidth="2" />
      {/* Visor */}
      <rect x="21" y="17" width="22" height="13" rx="6.5" fill="#101b39" />
      <rect x="23" y="19" width="18" height="9" rx="4.5" fill={profile.visorColor} fillOpacity="0.88" />
      {/* Visor Glint */}
      <path d="M25 21.5 L31 21.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      {/* Side Ear Comms */}
      <rect x="14.5" y="21" width="3.5" height="7" rx="1.5" fill={profile.trimColor} />
      <rect x="46" y="21" width="3.5" height="7" rx="1.5" fill={profile.trimColor} />
    </svg>
  );
}
