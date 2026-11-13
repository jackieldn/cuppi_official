import { splitDisclaimers } from '@/lib/disclaimers';
import { DisclaimerRef } from './disclaimer';

/**
 * Text with its disclaimer tags turned into (i) icons: "Medication{i:health} reminders" is the word "Medication" with
 * an icon beside it. The word and its icon never split across two lines. Plain text comes out as it went in.
 * Use it wherever page text is drawn; where an icon cannot go (inside a button, a page description) use
 * stripDisclaimers instead. It works in server and client components alike.
 */
export function MarkedText({ text }: { text: string }) {
  const parts = splitDisclaimers(text);
  if (parts.length === 1 && typeof parts[0] === 'string') return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part !== 'string') {
          // Already drawn with the word before it (see below), unless it follows a space, another tag, or starts the text.
          const before = parts[i - 1];
          return typeof before === 'string' && /\S$/.test(before) ? null : <DisclaimerRef key={i} id={part.disclaimer} />;
        }
        // The last word before a tag is held with its icon: they wrap together.
        const next = parts[i + 1];
        if (next && typeof next !== 'string') {
          const m = /^([\s\S]*?)(\S+)$/.exec(part);
          if (m) {
            return (
              <span key={i}>
                {m[1]}
                <span className="whitespace-nowrap">
                  {m[2]}
                  <DisclaimerRef id={(next as { disclaimer: string }).disclaimer} />
                </span>
              </span>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
