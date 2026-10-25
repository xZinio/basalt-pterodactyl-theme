import type { ReactNode } from 'react';
import { cn } from '@pterodactyl/sdk';
import { externalProps, safeUrl, useFollow } from './links';

// Bold (** or __), strikethrough, code, a link, then italic (* or _): the first that matches.
const inline = /(\*\*([^*]+?)\*\*|__([^_]+?)__|~~([^~]+?)~~|`([^`]+?)`|\[([^\]]+?)\]\(([^)\s]+?)\)|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_)/;
const bullet = /^\s*[-*+]\s+/;
const numbered = /^\s*\d+[.)]\s+/;

type Follow = ReturnType<typeof useFollow>;

function spans(text: string, follow: Follow, key: string): ReactNode[] {
    const out: ReactNode[] = [];
    let rest = text;
    let count = 0;

    while (rest) {
        const match = inline.exec(rest);
        if (!match) {
            out.push(rest);
            break;
        }
        if (match.index > 0) out.push(rest.slice(0, match.index));

        const id = `${key}-${count++}`;
        const [whole, , bold, boldUnder, struck, code, label, href, italic, italicUnder] = match;
        if (bold ?? boldUnder) {
            out.push(<strong key={id}>{spans(bold ?? boldUnder, follow, id)}</strong>);
        } else if (struck) {
            out.push(<s key={id}>{spans(struck, follow, id)}</s>);
        } else if (code) {
            out.push(<code key={id}>{code}</code>);
        } else if (label && href) {
            out.push(
                safeUrl(href) ? (
                    <a key={id} href={href} {...externalProps(href)} onClick={(event) => follow(event, href)}>
                        {spans(label, follow, id)}
                    </a>
                ) : (
                    label
                )
            );
        } else if (italic ?? italicUnder) {
            out.push(<em key={id}>{spans(italic ?? italicUnder, follow, id)}</em>);
        } else {
            out.push(whole);
        }
        rest = rest.slice(match.index + whole.length);
    }

    return out;
}

/**
 * Text an administrator wrote, with a little Markdown: **bold**, *italic*, ~~strikethrough~~,
 * `code`, [links](https://example.com), and lists whose lines start with - or 1. Paragraphs are
 * parted by a blank line; a single line break stays one. Nothing in it can become HTML.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
    const follow = useFollow();
    const blocks = text.replace(/\r/g, '').trim().split(/\n\s*\n/);

    return (
        <div className={cn('basalt-md', className)}>
            {blocks.map((block, index) => {
                const lines = block.split('\n');
                const key = `b${index}`;
                if (lines.every((line) => bullet.test(line))) {
                    return (
                        <ul key={key}>
                            {lines.map((line, n) => (
                                <li key={n}>{spans(line.replace(bullet, ''), follow, `${key}-${n}`)}</li>
                            ))}
                        </ul>
                    );
                }
                if (lines.every((line) => numbered.test(line))) {
                    return (
                        <ol key={key}>
                            {lines.map((line, n) => (
                                <li key={n}>{spans(line.replace(numbered, ''), follow, `${key}-${n}`)}</li>
                            ))}
                        </ol>
                    );
                }
                return <p key={key}>{lines.flatMap((line, n) => [...(n > 0 ? [<br key={`${key}-br${n}`} />] : []), ...spans(line, follow, `${key}-${n}`)])}</p>;
            })}
        </div>
    );
}
