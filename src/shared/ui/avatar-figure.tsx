import { presetFace, presetSrc, type StoredAvatar } from '@/shared/lib/avatar';
import { cn } from '@/shared/lib/cn';
import { AvatarArt } from './avatar-art';

/**
 * Avatar enregistré, quel que soit son type : portrait 3D (avec l'expression de l'humeur du jour)
 * ou personnage composé en SVG.
 */
export function AvatarFigure({ avatar, mood, className, title }: { avatar: StoredAvatar; mood?: number; className?: string; title?: string }) {
  if (avatar.kind === 'preset') {
    return (
      <img
        src={presetSrc(avatar.id, presetFace(avatar.id, mood))}
        alt={title ?? ''}
        aria-hidden={title ? undefined : true}
        draggable={false}
        loading="lazy"
        className={cn('rounded-full bg-surface-muted object-cover', className)}
      />
    );
  }
  return <AvatarArt config={avatar.config} mood={mood} className={className} title={title} />;
}
