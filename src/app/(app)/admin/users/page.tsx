'use client';
import AdminTable, { type FieldDef } from '@/components/admin/AdminTable';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui';

const FIELDS: FieldDef[] = [
  { key: 'id', label: 'ID', type: 'readonly', list: false },
  { key: 'username', label: 'Login', type: 'text' },
  { key: 'display_name', label: 'Ism', type: 'text' },
  { key: 'avatar', label: 'Avatar', type: 'text' },
  { key: 'role', label: 'Rol', type: 'select', options: [{ value: 'user', label: 'user' }, { value: 'admin', label: 'admin' }] },
  { key: 'level_cefr', label: 'Daraja', type: 'select', options: ['A1', 'A2', 'B1', 'B2', 'C1'].map((v) => ({ value: v, label: v })) },
  { key: 'xp', label: 'XP', type: 'number' },
  { key: 'level', label: 'Lvl', type: 'number', list: false },
  { key: 'weekly_xp', label: 'Haftalik XP', type: 'number', list: false },
  { key: 'league', label: 'Liga', type: 'select', options: ['bronze', 'silver', 'gold', 'diamond'].map((v) => ({ value: v, label: v })), list: false },
  { key: 'streak', label: 'Streak', type: 'number' },
  { key: 'streak_freezes', label: 'Muzlatish', type: 'number', list: false },
  { key: 'daily_goal_min', label: 'Maqsad (daq)', type: 'number', list: false },
  { key: 'tz', label: 'Vaqt zonasi', type: 'text', list: false },
  { key: 'banned', label: 'Bloklangan', type: 'bool' },
  { key: 'last_active_date', label: 'Oxirgi faollik', type: 'readonly' },
  { key: 'interests', label: 'Qiziqishlar (JSON)', type: 'json', list: false },
  { key: 'settings', label: 'Sozlamalar (JSON)', type: 'json', list: false },
];

export default function AdminUsers() {
  const { push } = useToast();
  return (
    <div>
      <PageHeader title="Foydalanuvchilar" sub="Rol, daraja, XP, streak, blok — hammasi tahrirlanadi. «Reset» progressni (so‘zlar, darslar, statistika) tozalaydi." />
      <AdminTable table="profiles" title="Profillar" fields={FIELDS} pk="id" orderBy="created_at" searchKeys={['username', 'display_name']}
        extraActions={(row, reload) => (
          <button className="btn-ghost px-2 py-1 text-xs text-gold-300" onClick={async () => {
            if (!confirm(`${row.username} progressini tozalashmi?`)) return;
            const { error } = await supabaseBrowser().rpc('admin_reset_user', { p_user: row.id });
            if (error) push({ kind: 'error', title: 'Xato', body: error.message }); else { push({ kind: 'success', title: 'Tozalandi' }); reload(); }
          }}>Reset</button>
        )} />
      <p className="mt-3 text-xs text-ink-400">Eslatma: profilni o‘chirish foydalanuvchi ma’lumotlarini o‘chiradi; auth yozuvini Supabase → Authentication → Users dan o‘chiring.</p>
    </div>
  );
}
