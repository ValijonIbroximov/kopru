'use client';
import { useEffect, useState } from 'react';
import AdminTable, { type FieldDef } from '@/components/admin/AdminTable';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader } from '@/components/ui';
import { cn } from '@/lib/utils';

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1'].map((v) => ({ value: v, label: v }));
const POS = ['noun', 'verb', 'adj', 'adv', 'phrase', 'number', 'pron'].map((v) => ({ value: v, label: v }));
const KINDS = [['vocab', 'Lug‘at'], ['grammar', 'Grammatika'], ['dialog', 'Dialog'], ['culture', 'Madaniyat'], ['cognates', 'Qarindosh so‘zlar'], ['boss', 'Boss']].map(([v, l]) => ({ value: v, label: l }));

export default function AdminContent() {
  const [res, setRes] = useState<'units' | 'lessons' | 'words' | 'grammar_topics' | 'exercises' | 'quests' | 'achievements' | 'clubs' | 'messages' | 'activities'>('words');
  const [lessons, setLessons] = useState<{ value: number; label: string }[]>([]);
  const [units, setUnits] = useState<{ value: number; label: string }[]>([]);
  const [lessonFilter, setLessonFilter] = useState<number | ''>('');

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const [{ data: l }, { data: u }] = await Promise.all([sb.from('lessons').select('id, title_uz, unit_id').order('id'), sb.from('units').select('id, title_uz').order('order_index')]);
      setLessons((l ?? []).map((x) => ({ value: x.id, label: `#${x.id} ${x.title_uz}` })));
      setUnits((u ?? []).map((x) => ({ value: x.id, label: `#${x.id} ${x.title_uz}` })));
    })();
  }, [res]);

  const FIELDS: Record<string, { title: string; fields: FieldDef[]; search: string[]; order: string; defaults?: Record<string, unknown> }> = {
    units: { title: 'Bo‘limlar', order: 'order_index', search: ['title_uz', 'slug'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'slug', label: 'Slug', type: 'text' }, { key: 'title_uz', label: 'Nomi (uz)', type: 'text' }, { key: 'title_tr', label: 'Nomi (tr)', type: 'text' },
      { key: 'cefr', label: 'Daraja', type: 'select', options: CEFR }, { key: 'order_index', label: 'Tartib', type: 'number' }, { key: 'icon', label: 'Ikonka', type: 'text' }, { key: 'color', label: 'Rang', type: 'text', help: '#hex' },
      { key: 'is_published', label: 'Chop etilgan', type: 'bool' }, { key: 'description', label: 'Tavsif', type: 'textarea' },
    ], defaults: { cefr: 'A1', icon: '📘', color: '#ff6a2a', is_published: true, order_index: 99 } },
    lessons: { title: 'Darslar', order: 'id', search: ['title_uz', 'slug'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'unit_id', label: 'Bo‘lim', type: 'select', options: units }, { key: 'slug', label: 'Slug', type: 'text' }, { key: 'title_uz', label: 'Nomi (uz)', type: 'text' }, { key: 'title_tr', label: 'Nomi (tr)', type: 'text' },
      { key: 'kind', label: 'Turi', type: 'select', options: KINDS }, { key: 'order_index', label: 'Tartib', type: 'number' }, { key: 'xp_reward', label: 'XP', type: 'number' }, { key: 'is_published', label: 'Chop etilgan', type: 'bool' },
      { key: 'content', label: 'Kontent (JSON)', type: 'json', help: 'intro, tip, hook, dialog[{who,tr,uz}]' },
    ], defaults: { kind: 'vocab', xp_reward: 30, is_published: true, order_index: 1, content: { intro: '', tip: '' } } },
    words: { title: 'So‘zlar', order: 'id', search: ['tr', 'uz'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'lesson_id', label: 'Dars', type: 'select', options: lessons }, { key: 'tr', label: 'Turkcha', type: 'text' }, { key: 'uz', label: 'O‘zbekcha', type: 'text' },
      { key: 'pos', label: 'Turkum', type: 'select', options: POS }, { key: 'cefr', label: 'Daraja', type: 'select', options: CEFR }, { key: 'difficulty', label: 'Qiyinlik', type: 'number', list: false },
      { key: 'example_tr', label: 'Misol (tr)', type: 'text', list: false }, { key: 'example_uz', label: 'Misol (uz)', type: 'text', list: false },
      { key: 'cognate', label: 'Qarindosh / izoh', type: 'text' }, { key: 'false_friend', label: 'Yolg‘on do‘st', type: 'bool' }, { key: 'tags', label: 'Teglar', type: 'tags', list: false },
    ], defaults: { pos: 'noun', cefr: 'A1', difficulty: 1, false_friend: false, tags: [] } },
    grammar_topics: { title: 'Grammatika mavzulari', order: 'order_index', search: ['title_uz', 'code'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'code', label: 'Kod', type: 'text' }, { key: 'lesson_id', label: 'Dars', type: 'select', options: lessons }, { key: 'title_uz', label: 'Nomi (uz)', type: 'text' }, { key: 'title_tr', label: 'Nomi (tr)', type: 'text' },
      { key: 'cefr', label: 'Daraja', type: 'select', options: CEFR }, { key: 'order_index', label: 'Tartib', type: 'number' },
      { key: 'explanation_md', label: 'Tushuntirish (Markdown)', type: 'textarea' }, { key: 'drills', label: 'Drillar (JSON)', type: 'json', help: '[{sentence:"… ___ …", answer, options[], explain}]' }, { key: 'rules', label: 'Qoidalar (JSON)', type: 'json' },
    ], defaults: { cefr: 'A1', order_index: 99, drills: [], rules: {} } },
    exercises: { title: 'Qo‘lda yozilgan mashqlar', order: 'id', search: ['type'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'lesson_id', label: 'Dars', type: 'select', options: lessons }, { key: 'type', label: 'Turi', type: 'select', options: ['choice', 'fill', 'truefalse', 'order', 'typing'].map((v) => ({ value: v, label: v })) },
      { key: 'difficulty', label: 'Qiyinlik', type: 'number' }, { key: 'is_active', label: 'Faol', type: 'bool' }, { key: 'source', label: 'Manba', type: 'select', options: [{ value: 'manual', label: 'qo‘lda' }, { value: 'ai', label: 'AI' }] },
      { key: 'data', label: 'Ma’lumot (JSON)', type: 'json', help: 'mashq turi maydonlari' },
    ], defaults: { type: 'choice', difficulty: 1, is_active: true, source: 'manual', data: { prompt: '', options: ['', '', '', ''], answer: 0 } } },
    quests: { title: 'Questlar', order: 'id', search: ['title_uz', 'code'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'code', label: 'Kod', type: 'text' }, { key: 'title_uz', label: 'Nomi', type: 'text' }, { key: 'description_uz', label: 'Tavsif', type: 'text', list: false },
      { key: 'kind', label: 'Turi', type: 'select', options: [{ value: 'daily', label: 'kunlik' }, { value: 'weekly', label: 'haftalik' }, { value: 'once', label: 'bir martalik' }] },
      { key: 'metric', label: 'Metrika', type: 'select', options: ['xp', 'reviews', 'correct', 'lessons', 'minutes', 'sessions', 'perfect'].map((v) => ({ value: v, label: v })) },
      { key: 'target', label: 'Maqsad', type: 'number' }, { key: 'xp_reward', label: 'XP', type: 'number' }, { key: 'icon', label: 'Ikonka', type: 'text' }, { key: 'is_active', label: 'Faol', type: 'bool' },
    ], defaults: { kind: 'daily', metric: 'xp', target: 50, xp_reward: 15, icon: '🎯', is_active: true } },
    achievements: { title: 'Yutuqlar', order: 'id', search: ['title_uz', 'code'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'code', label: 'Kod', type: 'text' }, { key: 'title_uz', label: 'Nomi', type: 'text' }, { key: 'description_uz', label: 'Tavsif', type: 'text', list: false },
      { key: 'icon', label: 'Ikonka', type: 'text' }, { key: 'rarity', label: 'Kamyoblik', type: 'select', options: ['common', 'rare', 'epic', 'legendary'].map((v) => ({ value: v, label: v })) },
      { key: 'condition', label: 'Shart (JSON)', type: 'json', help: '{"metric":"streak|xp|level|words_seen|words_mastered|lessons_completed|reviews|duels_won|minutes|modes|perfect","gte":N}' },
      { key: 'xp_reward', label: 'XP', type: 'number' }, { key: 'is_active', label: 'Faol', type: 'bool' },
    ], defaults: { icon: '🏅', rarity: 'common', condition: { metric: 'streak', gte: 3 }, xp_reward: 50, is_active: true } },
    clubs: { title: 'Klublar', order: 'created_at', search: ['name', 'code'], fields: [
      { key: 'id', label: 'ID', type: 'readonly', list: false }, { key: 'emoji', label: 'Belgi', type: 'text' }, { key: 'name', label: 'Nomi', type: 'text' }, { key: 'code', label: 'Kod', type: 'text' },
      { key: 'description', label: 'Tavsif', type: 'text', list: false }, { key: 'is_public', label: 'Ochiq', type: 'bool' }, { key: 'created_by', label: 'Egasi (user id)', type: 'readonly' }, { key: 'created_at', label: 'Yaratilgan', type: 'readonly' },
    ] },
    messages: { title: 'Xabarlar (moderatsiya)', order: 'created_at', search: ['text'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'sender_id', label: 'Yuboruvchi', type: 'readonly' }, { key: 'receiver_id', label: 'Qabul qiluvchi', type: 'readonly' }, { key: 'club_id', label: 'Klub', type: 'readonly' },
      { key: 'text', label: 'Matn', type: 'text' }, { key: 'created_at', label: 'Vaqt', type: 'readonly' },
    ] },
    activities: { title: 'Faollik lentasi', order: 'created_at', search: ['kind'], fields: [
      { key: 'id', label: 'ID', type: 'readonly' }, { key: 'user_id', label: 'Foydalanuvchi', type: 'readonly' }, { key: 'kind', label: 'Turi', type: 'text' }, { key: 'payload', label: 'Ma’lumot (JSON)', type: 'json' }, { key: 'created_at', label: 'Vaqt', type: 'readonly' },
    ] },
  };
  const cfg = FIELDS[res];

  return (
    <div>
      <PageHeader title="Kontent boshqaruvi" sub="Hamma narsa tahrirlanadi: qo‘shish, o‘zgartirish, o‘chirish, JSON import/eksport. O‘zgarishlar darhol kuchga kiradi." />
      <div className="mb-3 flex flex-wrap gap-1">
        {(Object.keys(FIELDS) as (typeof res)[]).map((k) => <button key={k} onClick={() => { setRes(k); setLessonFilter(''); }} className={cn('chip py-1.5 text-sm', res === k && 'border-teal-400 bg-teal-500/20 text-white')}>{FIELDS[k].title}</button>)}
      </div>
      {(res === 'words' || res === 'exercises' || res === 'grammar_topics') && (
        <div className="mb-3"><select className="input max-w-sm py-2 text-sm" value={lessonFilter} onChange={(e) => setLessonFilter(e.target.value ? Number(e.target.value) : '')}><option value="">Barcha darslar</option>{lessons.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
      )}
      <AdminTable key={res + String(lessonFilter)} table={res} title={cfg.title} fields={cfg.fields} orderBy={cfg.order} searchKeys={cfg.search} defaults={cfg.defaults}
        filter={lessonFilter !== '' ? { key: 'lesson_id', value: lessonFilter } : null} />
      <div className="mt-4 text-xs text-ink-400">
        <b>Maslahat:</b> B1/B2 kontentini tez qo‘shish uchun AI (ChatGPT/Claude/Gemini) dan so‘zlar ro‘yxatini JSON formatda so‘rang — maydonlar: tr, uz, pos, example_tr, example_uz, cognate, false_friend, tags, cefr, lesson_id — va "Import" tugmasi orqali yuklang.
      </div>
    </div>
  );
}
