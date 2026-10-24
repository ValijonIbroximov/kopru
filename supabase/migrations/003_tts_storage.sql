-- =====================================================================
--  TezBil — 3-yangilanish: TTS audio keshi uchun Storage bucket
--  Supabase → SQL Editor → Run. (Service role yozadi, hamma o'qiydi.)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts', 'tts', true, 2097152, array['audio/mpeg'])
on conflict (id) do update set public = true;

-- Ommaviy o'qish (ovoz fayllari maxfiy emas)
drop policy if exists "tts_public_read" on storage.objects;
create policy "tts_public_read" on storage.objects for select to public using (bucket_id = 'tts');

-- Yozish faqat service role (API route) orqali — RLS ni chetlab o'tadi, alohida policy shart emas.

-- Profil: ovoz tanlovi (emel/ahmet/browser) va til settings JSON ichida saqlanadi — sxema o'zgarmaydi.
