'use client';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export function ProgressRing({ value, size = 88, stroke = 9, color = '#ff6a2a', children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = 'bg-ember-500', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/10', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Stars({ n, max = 3 }: { n: number; max?: number }) {
  return <span className="text-sm">{Array.from({ length: max }, (_, i) => (i < n ? '★' : '☆')).join('')}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-white/[0.06]', className)} />;
}

export function Empty({ icon = '🌙', title, body, action }: { icon?: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
      {body && <p className="subtitle mt-1">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Confetti({ run }: { run: boolean }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; color: string; delay: number }[]>([]);
  useEffect(() => {
    if (!run) return;
    const colors = ['#ff6a2a', '#2fd1bc', '#ffcf4d', '#f43f6e', '#8b5cf6', '#ffffff'];
    setPieces(Array.from({ length: 60 }, (_, i) => ({ id: i, left: Math.random() * 100, color: colors[i % colors.length], delay: Math.random() * 0.6 })));
    const t = setTimeout(() => setPieces([]), 3000);
    return () => clearTimeout(t);
  }, [run]);
  if (!pieces.length) return null;
  return (
    <>
      {pieces.map((p) => (
        <span key={p.id} className="confetti-piece" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, transform: `rotate(${p.id * 13}deg)` }} />
      ))}
    </>
  );
}

/** Kichik, xavfsiz Markdown → HTML (grammatika tushuntirishlari uchun) */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return <div className={cn('prose-uz text-sm', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
export function renderMarkdown(md: string) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*\|/.test(l)) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const body = rows.filter((r) => !/^\s*\|\s*-+/.test(r));
      const [head, ...rest] = body;
      const cells = (r: string) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      out.push('<table><thead><tr>' + cells(head).map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
        rest.map((r) => '<tr>' + cells(r).map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^###\s/.test(l)) { out.push(`<h3>${inline(l.slice(4))}</h3>`); i++; continue; }
    if (/^##\s/.test(l)) { out.push(`<h2>${inline(l.slice(3))}</h2>`); i++; continue; }
    if (/^#\s/.test(l)) { out.push(`<h1>${inline(l.slice(2))}</h1>`); i++; continue; }
    if (/^\s*[-*]\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s/, ''))}</li>`); i++; }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (l.trim() === '') { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#|\s*[-*]\s|\s*\|)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="title">{title}</h1>
        {sub && <p className="subtitle mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
