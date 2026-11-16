import React from 'react';

interface MarkdownRendererProps {
  markdown: string;
}

function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match inline code, links, bold (** or __), strikethrough (~~), italic (* or _)
  const pattern =
    /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIdx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${partIdx++}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[12px] text-sky-800 dark:text-sky-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const label = linkMatch[1];
        const safeUrl = sanitizeHref(linkMatch[2]);
        if (safeUrl) {
          nodes.push(
            <a
              key={key}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 dark:text-sky-400 underline underline-offset-2 hover:text-sky-900 dark:hover:text-sky-300"
            >
              {label}
            </a>
          );
        } else {
          nodes.push(label);
        }
      } else {
        nodes.push(token);
      }
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900 dark:text-slate-50">
          {renderInline(token.slice(2, -2), `${key}-b`)}
        </strong>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(
        <del key={key} className="line-through text-slate-500 dark:text-slate-400">
          {renderInline(token.slice(2, -2), `${key}-s`)}
        </del>
      );
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      nodes.push(
        <em key={key} className="italic">
          {renderInline(token.slice(1, -1), `${key}-i`)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Fenced code block ```
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <div
          key={`code-${i}`}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-950 text-slate-100 overflow-x-auto"
        >
          {lang && (
            <div className="px-3 py-1 border-b border-slate-800 text-[10px] font-mono text-slate-400">
              {lang}
            </div>
          )}
          <pre className="p-3 text-xs font-mono leading-relaxed whitespace-pre">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Horizontal rule
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(
        <hr key={`hr-${i}`} className="border-t border-slate-200 dark:border-slate-800 my-2" />
      );
      i += 1;
      continue;
    }

    // Headings # .. ####
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const key = `h-${i}`;
      if (level === 1) {
        blocks.push(
          <h3 key={key} className="text-lg font-bold text-slate-900 dark:text-slate-50 pt-1">
            {renderInline(content, key)}
          </h3>
        );
      } else if (level === 2) {
        blocks.push(
          <h4 key={key} className="text-base font-bold text-slate-900 dark:text-slate-100 pt-1">
            {renderInline(content, key)}
          </h4>
        );
      } else {
        blocks.push(
          <h5 key={key} className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-0.5">
            {renderInline(content, key)}
          </h5>
        );
      }
      i += 1;
      continue;
    }

    // Blockquote >
    if (line.trimStart().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 italic space-y-1"
        >
          {quoteLines.map((qLine, idx) => (
            <p key={idx}>{renderInline(qLine, `q-${i}-${idx}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Unordered list (- , * ) or task list (- [ ] , - [x] )
    if (/^\s*[-*]\s+/.test(line)) {
      const items: { text: string; task?: boolean }[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const rawItem = lines[i].replace(/^\s*[-*]\s+/, '');
        const taskMatch = /^\[( |x|X)\]\s+(.*)$/.exec(rawItem);
        if (taskMatch) {
          items.push({ text: taskMatch[2], task: taskMatch[1].toLowerCase() === 'x' });
        } else {
          items.push({ text: rawItem });
        }
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="space-y-1.5 pl-4 text-sm text-slate-700 dark:text-slate-300">
          {items.map((item, idx) => (
            <li
              key={idx}
              className={
                item.task === undefined ? 'list-disc leading-relaxed' : 'list-none -ml-4 flex items-start gap-2 leading-relaxed'
              }
            >
              {item.task !== undefined && (
                <span
                  aria-hidden="true"
                  className={`mt-1 w-3.5 h-3.5 rounded border inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    item.task
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {item.task ? '✓' : ''}
                </span>
              )}
              <span>{renderInline(item.text, `ul-${i}-${idx}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list (1. )
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol
          key={`ol-${i}`}
          className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300"
        >
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item, `ol-${i}-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (consume consecutive plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !lines[i].trimStart().startsWith('>') &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }

    blocks.push(
      <p key={`p-${i}`} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {renderInline(paraLines.join(' '), `p-${i}`)}
      </p>
    );
  }

  if (blocks.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
        Nessun contenuto da mostrare in anteprima.
      </p>
    );
  }

  return <div className="space-y-3">{blocks}</div>;
};
