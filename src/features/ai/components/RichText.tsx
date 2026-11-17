import { Fragment, type ReactNode } from 'react';

/** Gras (**…**) et italique (*…*) en éléments React : aucun HTML injecté. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Rendu sobre du markdown renvoyé par l'IA : titres, listes, citations, paragraphes. */
export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul key={`l${blocks.length}`} className="flex list-disc flex-col gap-1 pl-5">
        {items.map((l, i) => (
          <li key={i}>{inline(l)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flush();
    if (!line.trim() || /^-{3,}$/.test(line.trim())) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={blocks.length} className="font-semibold">
          {inline(heading[1])}
        </p>,
      );
    } else if (line.startsWith('>')) {
      blocks.push(
        <blockquote
          key={blocks.length}
          className="border-l-2 border-sec-reviews/40 pl-3 text-fg-muted"
        >
          {inline(line.replace(/^>\s?/, ''))}
        </blockquote>,
      );
    } else {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="flex flex-col gap-2">{blocks}</div>;
}
