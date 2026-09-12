-- Spikoo V1. Apply once to the dedicated Spikoo Supabase Free project.
-- No storage bucket, audio column, paid extension, server, or AI provider key.
begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  english_level text not null default 'beginner' check (english_level in ('beginner','intermediate','advanced')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  theme text not null default 'light' check (theme in ('light','dark','system')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  updated_at timestamptz not null default now()
);
create table public.practice_sessions (
  id uuid primary key, user_id uuid not null references public.profiles(user_id) on delete cascade,
  topic_id text not null check (char_length(topic_id) between 1 and 80),
  topic text not null check (char_length(topic) between 1 and 1000),
  topic_category text not null check (char_length(topic_category) between 1 and 100),
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  created_at timestamptz not null default now(), completed_at timestamptz,
  unique(id,user_id)
);
create table public.practice_attempts (
  id uuid primary key, user_id uuid not null references public.profiles(user_id) on delete cascade,
  session_id uuid not null, attempt_number integer not null check (attempt_number > 0),
  duration_seconds integer not null check (duration_seconds between 3 and 300),
  original_transcript text not null check (char_length(original_transcript) between 1 and 20000),
  corrected_transcript text not null check (char_length(corrected_transcript) between 1 and 24000),
  grammar_score numeric(3,1) not null check (grammar_score between 0 and 10),
  vocabulary_score numeric(3,1) not null check (vocabulary_score between 0 and 10),
  clarity_score numeric(3,1) not null check (clarity_score between 0 and 10),
  overall_score numeric(3,1) not null check (overall_score between 0 and 10),
  remark text not null check (remark in ('Very Bad','Bad','Good','Very Good','Excellent')),
  teacher_feedback text not null check (char_length(teacher_feedback) between 1 and 2000),
  strengths text[] not null default '{}' check (cardinality(strengths) <= 3),
  focus_next text not null check (char_length(focus_next) between 1 and 2000),
  timezone text not null, activity_date date not null,
  completed_at timestamptz not null, created_at timestamptz not null default now(),
  request_fingerprint text not null,
  unique(id,user_id), unique(session_id,attempt_number),
  foreign key(session_id,user_id) references public.practice_sessions(id,user_id) on delete cascade
);
create table public.corrections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  attempt_id uuid not null, ordinal integer not null check (ordinal between 1 and 100),
  sentence_id text not null check (sentence_id ~ '^sentence_[0-9]+$'),
  original_text text not null check (char_length(original_text) between 1 and 2000),
  occurrence integer not null check (occurrence between 1 and 500),
  replacement_text text not null check (char_length(replacement_text) <= 2000),
  simple_explanation text not null check (char_length(simple_explanation) between 1 and 2000),
  category text not null check (category in ('grammar','vocabulary','clarity','word_choice','sentence_structure')),
  severity text not null check (severity in ('minor','important')),
  correction_type text not null check (correction_type in ('error','natural_improvement')),
  created_at timestamptz not null default now(), unique(attempt_id,ordinal),
  foreign key(attempt_id,user_id) references public.practice_attempts(id,user_id) on delete cascade
);
create table public.daily_activity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  activity_date date not null, session_count integer not null default 0 check (session_count >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  speaking_seconds bigint not null default 0 check (speaking_seconds >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,activity_date)
);
create index practice_sessions_user_completed on public.practice_sessions(user_id,completed_at desc);
create index practice_attempts_user_completed on public.practice_attempts(user_id,completed_at desc);
create index practice_attempts_session_user on public.practice_attempts(session_id,user_id);
create index practice_attempts_user_day on public.practice_attempts(user_id,activity_date,session_id);
create index corrections_attempt_user on public.corrections(attempt_id,user_id);
create index corrections_user on public.corrections(user_id);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.corrections enable row level security;
alter table public.daily_activity enable row level security;
create policy profiles_read_own on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy preferences_read_own on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy preferences_update_own on public.user_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy sessions_read_own on public.practice_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy attempts_read_own on public.practice_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy corrections_read_own on public.corrections for select to authenticated using (user_id = (select auth.uid()));
create policy activity_read_own on public.daily_activity for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.profiles, public.user_preferences, public.practice_sessions, public.practice_attempts, public.corrections, public.daily_activity from anon, authenticated;
grant select on public.profiles, public.user_preferences, public.practice_sessions, public.practice_attempts, public.corrections, public.daily_activity to authenticated;
grant update(display_name,english_level,onboarding_completed) on public.profiles to authenticated;
grant update(theme,timezone) on public.user_preferences to authenticated;

create function public.spikoo_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.spikoo_touch_updated_at();
create trigger preferences_updated before update on public.user_preferences for each row execute function public.spikoo_touch_updated_at();
create function public.spikoo_validate_timezone() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then raise exception 'Invalid time zone'; end if;
  return new;
end;
$$;
create trigger preferences_timezone before insert or update on public.user_preferences for each row execute function public.spikoo_validate_timezone();

create function public.spikoo_create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id,display_name) values (new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),60));
  insert into public.user_preferences(user_id) values (new.id);
  return new;
end;
$$;
create trigger spikoo_auth_user_created after insert on auth.users for each row execute function public.spikoo_create_profile();
-- Initialize only accounts in this dedicated project, if any already exist.
insert into public.profiles(user_id,display_name) select id,left(coalesce(raw_user_meta_data->>'display_name',''),60) from auth.users on conflict (user_id) do nothing;
insert into public.user_preferences(user_id) select user_id from public.profiles on conflict (user_id) do nothing;

create function public.save_practice_attempt(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_id uuid; v_session_id uuid; v_existing public.practice_attempts%rowtype;
  v_session public.practice_sessions%rowtype; v_number integer; v_date date; v_completed timestamptz;
  v_timezone text; v_duration integer; v_analysis jsonb; v_c jsonb; v_ordinal integer := 0;
  v_fingerprint text; v_scores jsonb; v_score numeric; v_strengths text[]; v_remark text;
begin
  -- This narrowly scoped definer is the only writer of the immutable ledger.
  -- Identity is always the JWT's auth.uid(), never a client-supplied owner ID.
  -- Every existing parent and idempotency record is rechecked against that identity.
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 262144 then raise exception 'Invalid attempt'; end if;
  v_id := (p_payload->>'id')::uuid; v_session_id := (p_payload->>'session_id')::uuid;
  if v_id is null or v_session_id is null then raise exception 'Missing attempt identifiers'; end if;
  v_fingerprint := md5(p_payload::text);
  -- Serialize this learner's writes; double clicks and parallel tabs cannot race numbering/activity.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  select * into v_existing from public.practice_attempts where id = v_id;
  if found then
    if v_existing.user_id <> v_uid or v_existing.request_fingerprint <> v_fingerprint then raise exception 'Attempt identifier is unavailable' using errcode = '42501'; end if;
    return jsonb_build_object('id',v_existing.id,'attempt_number',v_existing.attempt_number);
  end if;
  if not exists (select 1 from public.profiles where user_id = v_uid and onboarding_completed) then raise exception 'Finish your profile first'; end if;
  v_timezone := p_payload->>'timezone';
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_timezone) then raise exception 'Invalid time zone'; end if;
  v_completed := (p_payload->>'completed_at')::timestamptz;
  if v_completed is null or not isfinite(v_completed) or v_completed > now() + interval '5 minutes' or v_completed < now() - interval '7 days' then raise exception 'Invalid completion time'; end if;
  v_date := (v_completed at time zone v_timezone)::date;
  v_duration := (p_payload->>'duration_seconds')::integer;
  v_analysis := p_payload->'analysis'; v_scores := v_analysis->'scores';
  if jsonb_typeof(v_analysis) is distinct from 'object' or jsonb_typeof(v_scores) is distinct from 'object' or jsonb_typeof(v_analysis->'corrections') is distinct from 'array' or jsonb_array_length(v_analysis->'corrections') > 100 or jsonb_typeof(v_analysis->'strengths') is distinct from 'array' or jsonb_array_length(v_analysis->'strengths') > 3 then raise exception 'Invalid feedback'; end if;
  foreach v_timezone in array array['grammar','vocabulary','clarity','overall'] loop
    if jsonb_typeof(v_scores->v_timezone) is distinct from 'number' then raise exception 'Invalid score'; end if;
    v_score := (v_scores->>v_timezone)::numeric;
    if v_score < 0 or v_score > 10 then raise exception 'Invalid score'; end if;
  end loop;
  v_timezone := p_payload->>'timezone';
  if exists(select 1 from jsonb_array_elements(v_analysis->'strengths') s where jsonb_typeof(s) <> 'string' or char_length(s #>> '{}') not between 1 and 2000) then raise exception 'Invalid strength'; end if;
  select coalesce(array_agg(value),'{}'::text[]) into v_strengths from jsonb_array_elements_text(v_analysis->'strengths');
  v_score := round((v_scores->>'overall')::numeric,1);
  v_remark := case when v_score < 3 then 'Very Bad' when v_score < 5 then 'Bad' when v_score < 7 then 'Good' when v_score < 8.5 then 'Very Good' else 'Excellent' end;
  insert into public.practice_sessions(id,user_id,topic_id,topic,topic_category,difficulty,completed_at)
    values(v_session_id,v_uid,p_payload->>'topic_id',p_payload->>'topic',p_payload->>'topic_category',p_payload->>'difficulty',v_completed)
    on conflict(id) do nothing;
  select * into v_session from public.practice_sessions where id = v_session_id;
  if v_session.user_id is distinct from v_uid or v_session.topic is distinct from p_payload->>'topic' or v_session.topic_id is distinct from p_payload->>'topic_id' or v_session.difficulty is distinct from p_payload->>'difficulty' or v_session.topic_category is distinct from p_payload->>'topic_category' then raise exception 'Topic session is unavailable' using errcode = '42501'; end if;
  select coalesce(max(attempt_number),0)+1 into v_number from public.practice_attempts where session_id = v_session_id and user_id = v_uid;
  insert into public.practice_attempts(id,user_id,session_id,attempt_number,duration_seconds,original_transcript,corrected_transcript,grammar_score,vocabulary_score,clarity_score,overall_score,remark,teacher_feedback,strengths,focus_next,timezone,activity_date,completed_at,request_fingerprint)
    values(v_id,v_uid,v_session_id,v_number,v_duration,v_analysis->>'originalTranscript',v_analysis->>'correctedTranscript',(v_scores->>'grammar')::numeric,(v_scores->>'vocabulary')::numeric,(v_scores->>'clarity')::numeric,(v_scores->>'overall')::numeric,v_remark,v_analysis->>'teacherFeedback',v_strengths,v_analysis->>'focusNext',v_timezone,v_date,v_completed,v_fingerprint);
  for v_c in select value from jsonb_array_elements(v_analysis->'corrections') loop
    v_ordinal := v_ordinal + 1;
    insert into public.corrections(user_id,attempt_id,ordinal,sentence_id,original_text,occurrence,replacement_text,simple_explanation,category,severity,correction_type)
      values(v_uid,v_id,v_ordinal,v_c->>'sentenceId',v_c->>'originalText',(v_c->>'occurrence')::integer,v_c->>'replacementText',v_c->>'simpleExplanation',v_c->>'category',v_c->>'severity',v_c->>'correctionType');
  end loop;
  update public.practice_sessions set completed_at = greatest(completed_at,v_completed) where id = v_session_id and user_id = v_uid;
  -- Recompute this one small day's aggregate inside the same transaction.
  insert into public.daily_activity(user_id,activity_date,session_count,attempt_count,speaking_seconds)
    select v_uid,v_date,count(distinct session_id),count(*),sum(duration_seconds) from public.practice_attempts where user_id = v_uid and activity_date = v_date
    on conflict(user_id,activity_date) do update set session_count = excluded.session_count,attempt_count = excluded.attempt_count,speaking_seconds = excluded.speaking_seconds,updated_at = now();
  return jsonb_build_object('id',v_id,'attempt_number',v_number);
end;
$$;
-- Functions otherwise inherit PUBLIC execution in PostgreSQL.
revoke all on function public.save_practice_attempt(jsonb) from public,anon,authenticated;
grant execute on function public.save_practice_attempt(jsonb) to authenticated;
revoke all on function public.spikoo_create_profile() from public,anon,authenticated;
revoke all on function public.spikoo_touch_updated_at() from public,anon,authenticated;
revoke all on function public.spikoo_validate_timezone() from public,anon,authenticated;

create view public.user_stats with (security_invoker = true) as
with totals as (
  select user_id,count(distinct session_id)::integer as total_sessions,count(*)::integer as total_attempts,
    sum(duration_seconds)::bigint as total_speaking_seconds,
    round(avg(grammar_score),1) as average_grammar_score,round(avg(vocabulary_score),1) as average_vocabulary_score,
    round(avg(clarity_score),1) as average_clarity_score,round(avg(overall_score),1) as average_overall_score
  from public.practice_attempts group by user_id
), active as (
  select d.user_id,d.activity_date,d.activity_date - (row_number() over (partition by d.user_id order by d.activity_date))::integer as island
  from public.daily_activity d join public.user_preferences pref on pref.user_id = d.user_id
  where d.attempt_count > 0 and d.activity_date <= (now() at time zone pref.timezone)::date
), runs as (
  select user_id,max(activity_date) as last_day,count(*)::integer as days from active group by user_id,island
), streaks as (
  select r.user_id,max(r.days)::integer as longest_streak,
    coalesce(max(r.days) filter (where r.last_day between (now() at time zone p.timezone)::date - 1 and (now() at time zone p.timezone)::date),0)::integer as current_streak,
    sum(r.days)::integer as practice_days
  from runs r join public.user_preferences p on p.user_id = r.user_id group by r.user_id
)
select p.user_id,coalesce(t.total_sessions,0) as total_sessions,coalesce(t.total_attempts,0) as total_attempts,
  coalesce(t.total_speaking_seconds,0) as total_speaking_seconds,t.average_grammar_score,t.average_vocabulary_score,t.average_clarity_score,t.average_overall_score,
  coalesce(s.current_streak,0) as current_streak,coalesce(s.longest_streak,0) as longest_streak,coalesce(s.practice_days,0) as practice_days
from public.profiles p left join totals t on t.user_id = p.user_id left join streaks s on s.user_id = p.user_id;
revoke all on public.user_stats from anon,authenticated;
grant select on public.user_stats to authenticated;
comment on function public.save_practice_attempt(jsonb) is 'Authenticated, owner-scoped, atomic and idempotent practice save. No audio. Client-provided AI scores are learner feedback, not certified assessments.';
commit;
