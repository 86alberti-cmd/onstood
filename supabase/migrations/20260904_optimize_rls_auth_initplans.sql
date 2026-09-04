-- Performance-only RLS rewrite: preserve policy semantics while evaluating auth.uid() once per statement.

alter policy "ai_conversations_owner_all" on public.ai_conversations using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "users read own ai insights" on public.ai_insights using ((select auth.uid()) = user_id);
alter policy "users update own ai insights" on public.ai_insights using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "ai_messages_owner_delete" on public.ai_messages using (user_id = (select auth.uid()));
alter policy "ai_messages_owner_insert" on public.ai_messages with check ((user_id = (select auth.uid())) and exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = (select auth.uid())));
alter policy "ai_messages_owner_select" on public.ai_messages using (user_id = (select auth.uid()));
alter policy "users create allowed follows" on public.follows with check (((select auth.uid()) = follower_id) and public.can_follow(following_id));
alter policy "users delete own follows" on public.follows using ((select auth.uid()) = follower_id);
alter policy "knowledge_chunks_owner_select" on public.onstood_knowledge_chunks using (owner_id = (select auth.uid()));
alter policy "knowledge_documents_owner_select" on public.onstood_knowledge_documents using (owner_id = (select auth.uid()));
alter policy "upload_declaration_insert_own" on public.onstood_upload_declarations with check (user_id = (select auth.uid()));
alter policy "upload_declaration_select_own" on public.onstood_upload_declarations using (user_id = (select auth.uid()));
alter policy "upload_declaration_update_own" on public.onstood_upload_declarations using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "album owners manage" on public.photo_albums using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter policy "albums visible by privacy" on public.photo_albums using ((owner_id = (select auth.uid())) or visibility = 'public' or (visibility = 'connections' and public.is_connection((select auth.uid()), owner_id)));
alter policy "photo owners manage" on public.photos using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter policy "photos visible by privacy" on public.photos using ((owner_id = (select auth.uid())) or visibility = 'public' or (visibility = 'connections' and public.is_connection((select auth.uid()), owner_id)));
alter policy "users delete own post media" on public.post_media using (owner_id = (select auth.uid()));
alter policy "users insert own post media" on public.post_media with check ((owner_id = (select auth.uid())) and exists (select 1 from public.posts p where p.id = post_media.post_id and p.user_id = (select auth.uid())));
alter policy "users update own post media" on public.post_media using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "users update own posts" on public.posts using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "profile picture history visible by privacy" on public.profile_picture_history using ((user_id = (select auth.uid())) or visibility = 'public' or (visibility = 'connections' and public.is_connection((select auth.uid()), user_id)));
alter policy "users delete own profile picture history" on public.profile_picture_history using (user_id = (select auth.uid()));
alter policy "users insert own profile picture history" on public.profile_picture_history with check (user_id = (select auth.uid()));
