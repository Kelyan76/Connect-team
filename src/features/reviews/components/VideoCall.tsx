import '@livekit/components-styles';
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Loader2, PhoneOff, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toUserMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { getVideoAccess } from '../video';

/** Mosaïque des participants (caméras et partage d'écran) et barre de commandes en icônes. */
function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <div className="flex h-full flex-col">
      <GridLayout tracks={tracks} className="min-h-0 flex-1">
        <ParticipantTile />
      </GridLayout>
      {/* Boutons en icônes seules (micro, caméra, partage d'écran, quitter) : pas de libellés en anglais. */}
      <ControlBar variation="minimal" controls={{ chat: false, settings: false }} />
    </div>
  );
}

/**
 * Visio du 1 à 1, intégrée à la page (LiveKit Cloud) : le guide, les notes et Echo restent juste en dessous.
 * Chargée à la demande (bouton « Visio ») pour ne pas alourdir la page.
 */
export default function VideoCall({
  reviewId,
  onClose,
}: {
  reviewId: string;
  onClose: () => void;
}) {
  const [access, setAccess] = useState<{ url: string; token: string } | null>(null);
  const [error, setError] = useState('');
  const joined = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getVideoAccess(reviewId)
      .then((a) => !cancelled && setAccess(a))
      .catch(
        (e: unknown) => !cancelled && setError(toUserMessage(e, 'La visio n’a pas pu démarrer.')),
      );
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  return (
    <section aria-label="Visio du 1 à 1" className="mb-6 flex animate-page-in flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-base font-medium">
          <Video className="size-4 text-accent" aria-hidden />
          Visio
          {!access && !error && (
            <Loader2 className="size-4 text-fg-subtle motion-safe:animate-spin" aria-hidden />
          )}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:text-danger"
          onClick={onClose}
        >
          <PhoneOff aria-hidden />
          Quitter
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-fg-muted"
        >
          {error}
        </p>
      ) : access ? (
        <LiveKitRoom
          serverUrl={access.url}
          token={access.token}
          connect
          video
          audio
          data-lk-theme="default"
          className="h-[60vh] min-h-80 w-full overflow-hidden rounded-lg border border-line"
          onConnected={() => {
            joined.current = true;
          }}
          // On ne referme qu'après une vraie participation : un échec de connexion reste affiché.
          onDisconnected={() => joined.current && onClose()}
          onError={(e) => setError(`La visio n’a pas pu démarrer : ${e.message}`)}
          onMediaDeviceFailure={() =>
            setError(
              'Caméra ou micro inaccessible : autorisez-les dans le navigateur, puis relancez la visio.',
            )
          }
        >
          <Stage />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div className="h-[60vh] min-h-80 w-full animate-pulse rounded-lg border border-line bg-surface-muted motion-reduce:animate-none" />
      )}
    </section>
  );
}
