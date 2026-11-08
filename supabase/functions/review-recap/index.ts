// Edge Function (Deno) : récap d'un entretien à partir de sa transcription vocale.
// • Seul le manager de l'entretien peut l'appeler (session vérifiée ici, verify_jwt désactivé).
// • La transcription est envoyée à Claude pour en tirer un compte-rendu structuré ; elle n'est ni
//   stockée ni journalisée. Le manager relit le résultat avant de l'ajouter au compte-rendu.
// Secret requis : ANTHROPIC_API_KEY (sans lui, la fonction répond 503).
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { secretKey } from '../_shared/push.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MAX_TRANSCRIPT = 60_000;

// Réponse imposée (structured outputs) : le front affiche ces champs tels quels.
const RECAP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['synthese', 'points', 'decisions', 'actions', 'vigilance'],
  properties: {
    synthese: { type: 'string', description: 'Synthèse partageable avec le collaborateur, 3 à 5 phrases, ton neutre et bienveillant.' },
    points: { type: 'array', items: { type: 'string' }, description: 'Sujets abordés, une phrase courte chacun.' },
    decisions: { type: 'array', items: { type: 'string' }, description: 'Décisions prises ou accords explicites.' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['titre', 'responsable', 'echeance'],
        properties: {
          titre: { type: 'string' },
          responsable: { type: 'string', enum: ['manager', 'collaborateur'] },
          echeance: { type: ['string', 'null'], description: 'Date AAAA-MM-JJ si elle a été dite, sinon null.' },
        },
      },
    },
    vigilance: {
      type: 'array',
      items: { type: 'string' },
      description: 'Signaux à suivre pour le manager seulement (charge, motivation, tensions). Vide si rien.',
    },
  },
};

const SYSTEM = `Tu rédiges le compte-rendu d'un entretien entre un manager et un collaborateur d'une PME française.
On te donne la transcription automatique de l'échange (reconnaissance vocale : ponctuation approximative, mots parfois mal reconnus, sans indication de qui parle).
Rédige en français, de façon factuelle et concise, sans inventer : n'écris que ce qui a été dit ou clairement convenu. Si un point est ambigu, formule-le prudemment plutôt que de trancher.
La synthèse sera lue et signée par les deux personnes : reste neutre et respectueux, sans jugement sur la personne.
Les points de vigilance sont réservés au manager : signaux de surcharge, de démotivation ou de tension évoqués pendant l'échange.
Les échéances : uniquement si une date ou un délai précis a été mentionné ; convertis-les en date AAAA-MM-JJ à partir de la date de l'entretien.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const uid = auth.user?.id;
  if (!uid) return json(401, { error: 'Session expirée. Reconnectez-vous.' });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json(503, { error: 'Le récap automatique n’est pas encore configuré.' });

  const body = await req.json().catch(() => ({}));
  const transcript = String(body.transcript ?? '').trim();
  if (transcript.length < 40) return json(400, { error: 'La transcription est trop courte pour en faire un récap.' });
  if (transcript.length > MAX_TRANSCRIPT) {
    return json(413, { error: 'La transcription est trop longue : générez le récap par parties.' });
  }

  const { data: review } = await admin.from('reviews').select('id, kind, scheduled_at, manager_id, collaborator_id').eq('id', String(body.review_id ?? '')).single();
  if (!review || review.manager_id !== uid) return json(403, { error: 'Seul le manager de cet entretien peut générer son récap.' });
  const { data: who } = await admin.from('profiles').select('first_name').eq('id', review.collaborator_id).single();

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // Si la demande est déclinée par les filtres de sécurité, l'API bascule d'elle-même sur un autre modèle.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: RECAP_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Entretien (${review.kind}) du ${review.scheduled_at.slice(0, 10)} avec ${who?.first_name ?? 'le collaborateur'}.\n\nTranscription :\n${transcript}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal') return json(422, { error: 'Le récap n’a pas pu être généré pour cet échange.' });
    if (response.stop_reason === 'max_tokens') return json(502, { error: 'Le récap est incomplet : réessayez avec une transcription plus courte.' });
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json(502, { error: 'Réponse inattendue du service de récap.' });
    return json(200, { recap: JSON.parse(text.text) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: 'Trop de demandes : réessayez dans une minute.' });
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: 'Le récap automatique est mal configuré (clé).' });
    if (e instanceof Anthropic.APIError) {
      console.error('review-recap', e.status, e.message);
      return json(502, { error: 'Le service de récap est indisponible pour le moment.' });
    }
    console.error('review-recap', e);
    return json(500, { error: 'Le récap n’a pas pu être généré.' });
  }
});
