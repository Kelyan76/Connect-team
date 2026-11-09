import { useId } from 'react';
import { AVATAR_OPTIONS, moodFace, type AvatarConfig } from '@/shared/lib/avatar';

const INK = '#2A2236';

function Hair({ style, back }: { style: number; back: boolean }) {
  // Les cheveux longs passent aussi derrière la tête.
  if (back) return style === 3 ? <path d="M30 52C28 26 44 17 60 17C78 17 92 27 90 52L93 90C85 95 78 92 74 87H46C42 92 35 95 27 90Z" /> : null;
  switch (style) {
    case 1:
      return <path d="M33 50C31 27 46 19 60 19C76 19 90 28 87 50C83 39 75 33 60 33C46 33 38 39 33 50Z" />;
    case 2:
      return <path d="M33 49C29 25 48 14 65 17C84 20 91 33 87 49C84 38 72 30 57 31C49 32 43 29 40 26C38 35 35 41 33 49Z" />;
    case 3:
      return <path d="M34 47C36 30 48 23 60 23C74 23 84 31 86 47C78 38 70 35 60 36C50 35 42 40 34 47Z" />;
    case 4:
      return (
        <>
          <circle cx="60" cy="15" r="10" />
          <path d="M33 50C31 27 46 21 60 21C76 21 90 28 87 50C83 39 75 34 60 34C46 34 38 39 33 50Z" />
        </>
      );
    case 5:
      return (
        <>
          {[
            [35, 44],
            [38, 33],
            [46, 25],
            [56, 21],
            [66, 21],
            [75, 26],
            [82, 34],
            [85, 44],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="9" />
          ))}
        </>
      );
    default:
      return null;
  }
}

function Eyes({ style }: { style: number }) {
  const round = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy="52" rx="4.6" ry="5" fill="#fff" />
      <circle cx={cx + 0.6} cy="52.6" r="2.7" fill={INK} />
      <circle cx={cx + 1.6} cy="51.2" r="1" fill="#fff" />
    </g>
  );
  const closed = (cx: number) => <path key={cx} d={`M${cx - 4} 53Q${cx} 48 ${cx + 4} 53`} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
  switch (style) {
    case 1:
      return <>{[50, 70].map(closed)}</>;
    case 2:
      return (
        <>
          {[50, 70].map((cx) => (
            <ellipse key={cx} cx={cx} cy="52" rx="2.2" ry="3" fill={INK} />
          ))}
        </>
      );
    case 3:
      return (
        <>
          {round(50)}
          {closed(70)}
        </>
      );
    default:
      return <>{[50, 70].map(round)}</>;
  }
}

function Mouth({ style }: { style: number }) {
  switch (style) {
    case 1:
      return (
        <g>
          <path d="M50 64Q60 77 70 64Z" fill={INK} />
          <path d="M54 69Q60 74 66 69Q60 72 54 69Z" fill="#F07A8A" />
        </g>
      );
    case 2:
      return <path d="M53 67H67" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />;
    case 3:
      return <ellipse cx="60" cy="67" rx="3.4" ry="4" fill={INK} />;
    case 4:
      return <path d="M52 69Q60 62 68 69" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />;
    default:
      return <path d="M51 64Q60 72 69 64" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />;
  }
}

/**
 * Personnage en volume « pâte à modeler » : formes simples, lumière en haut à gauche,
 * ombres douces sur les bords. Tout est en SVG : net à toutes les tailles, sans image à charger.
 * `mood` (1 à 5) remplace l'expression choisie par celle de l'humeur du jour.
 */
export function AvatarArt({ config, className, title, mood }: { config: AvatarConfig; className?: string; title?: string; mood?: number }) {
  const face = mood ? moodFace(mood) : { eyes: config.eyes, mouth: config.mouth };
  const uid = useId().replace(/:/g, '');
  const light = `l${uid}`;
  const shade = `s${uid}`;
  const clip = `c${uid}`;
  const skin = AVATAR_OPTIONS.skin[config.skin];
  const hairColor = AVATAR_OPTIONS.hairColor[config.hairColor];
  const shirt = AVATAR_OPTIONS.shirt[config.shirt];
  const bg = AVATAR_OPTIONS.bg[config.bg];
  const volume = (shape: React.ReactNode) => (
    <>
      {shape}
      <g fill={`url(#${light})`}>{shape}</g>
      <g fill={`url(#${shade})`}>{shape}</g>
    </>
  );

  return (
    <svg viewBox="0 0 120 120" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <radialGradient id={light} cx="0.32" cy="0.28" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={shade} cx="0.45" cy="0.4" r="0.7">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
        <clipPath id={clip}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="120" height="120" fill={bg} />
        <circle cx="38" cy="30" r="70" fill={`url(#${light})`} />
        <g fill={hairColor}>{volume(<Hair style={config.hair} back />)}</g>
        <g fill={shirt}>{volume(<path d="M16 122C16 93 37 82 60 82C83 82 104 93 104 122Z" />)}</g>
        <rect x="51" y="68" width="18" height="18" rx="8" fill={skin} />
        <ellipse cx="60" cy="80" rx="12" ry="4" fill="#000" opacity="0.12" />
        <g fill={skin}>
          {volume(
            <>
              <ellipse cx="34" cy="55" rx="5.5" ry="7.5" />
              <ellipse cx="86" cy="55" rx="5.5" ry="7.5" />
              <ellipse cx="60" cy="52" rx="26" ry="28" />
            </>,
          )}
        </g>
        <circle cx="45" cy="62" r="4.5" fill="#FF7A7A" opacity="0.28" />
        <circle cx="75" cy="62" r="4.5" fill="#FF7A7A" opacity="0.28" />
        <Eyes style={face.eyes} />
        <Mouth style={face.mouth} />
        <g fill={hairColor}>{volume(<Hair style={config.hair} back={false} />)}</g>
        {config.accessory === 1 && (
          <g fill="none" stroke={INK} strokeWidth="2.2">
            <rect x="41" y="45" width="17" height="14" rx="6" fill="#fff" fillOpacity="0.18" />
            <rect x="62" y="45" width="17" height="14" rx="6" fill="#fff" fillOpacity="0.18" />
            <path d="M58 51H62" />
          </g>
        )}
        {config.accessory === 2 && (
          <g>
            <path d="M30 54C30 26 44 15 60 15C76 15 90 26 90 54" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
            <g fill={shirt}>{volume(<><rect x="25" y="46" width="12" height="20" rx="6" /><rect x="83" y="46" width="12" height="20" rx="6" /></>)}</g>
          </g>
        )}
        {config.accessory === 3 && (
          <g fill={shirt}>
            {volume(<path d="M32 44C31 24 45 14 60 14C75 14 89 24 88 44Z" />)}
            <rect x="30" y="40" width="60" height="9" rx="4.5" fill="#fff" opacity="0.85" />
            <circle cx="60" cy="13" r="5" fill="#fff" />
          </g>
        )}
      </g>
    </svg>
  );
}
