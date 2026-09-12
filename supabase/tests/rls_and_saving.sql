-- Run in the dedicated Spikoo project's SQL Editor as postgres.
-- Temporary account identities have no password/email; nothing survives ROLLBACK.
begin;
insert into auth.users(id,aud,role,raw_user_meta_data) values
 ('a10c0000-0000-4000-8000-000000000001','authenticated','authenticated','{"display_name":"RLS Test A"}'),
 ('b10c0000-0000-4000-8000-000000000002','authenticated','authenticated','{"display_name":"RLS Test B"}');
update public.profiles set onboarding_completed=true where user_id in ('a10c0000-0000-4000-8000-000000000001','b10c0000-0000-4000-8000-000000000002');
update public.user_preferences set timezone='Asia/Kolkata' where user_id in ('a10c0000-0000-4000-8000-000000000001','b10c0000-0000-4000-8000-000000000002');
create temporary table spikoo_test_payload(payload jsonb);
insert into spikoo_test_payload values(jsonb_build_object(
 'id','a10c0000-0000-4000-8000-000000000010','session_id','a10c0000-0000-4000-8000-000000000020',
 'topic_id','topic-5','topic','What did you do yesterday?','topic_category','Personal experience','difficulty','beginner',
 'duration_seconds',60,'completed_at',now(),'timezone','Asia/Kolkata',
 'analysis',jsonb_build_object('originalTranscript','Yesterday I go to the market.','correctedTranscript','Yesterday I went to the market.',
 'scores',jsonb_build_object('grammar',7,'vocabulary',7.5,'clarity',8,'overall',7.5),'remark','Very Good','teacherFeedback','Your story was clear. Use words for the past.','strengths',jsonb_build_array('Your main idea was clear.'),'focusNext','Use went when talking about yesterday.',
 'corrections',jsonb_build_array(jsonb_build_object('id','c1','sentenceId','sentence_1','originalText','go','occurrence',1,'replacementText','went','simpleExplanation','Yesterday is in the past, so use went.','category','grammar','severity','important','correctionType','error')))));
grant select on spikoo_test_payload to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a10c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare p jsonb; r jsonb; n integer; begin
 select payload into p from pg_temp.spikoo_test_payload;
 r:=public.save_practice_attempt(p);
 if r->>'attempt_number'<>'1' then raise exception 'FAIL: first attempt number'; end if;
 perform public.save_practice_attempt(p);
 if (select count(*) from public.practice_attempts)<>1 then raise exception 'FAIL: duplicate attempt'; end if;
 if (select attempt_count from public.daily_activity)<>1 then raise exception 'FAIL: duplicate activity'; end if;
 if (select count(*) from public.profiles)<>1 or (select count(*) from public.user_preferences)<>1 or (select count(*) from public.user_stats)<>1 then raise exception 'FAIL: profile/settings/stats leak'; end if;
 if (select current_streak from public.user_stats)<>1 then raise exception 'FAIL: first streak'; end if;
 update public.profiles set display_name='Wrong owner' where user_id='b10c0000-0000-4000-8000-000000000002';
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL: cross-user update'; end if;
 begin perform public.save_practice_attempt(jsonb_set(p,'{duration_seconds}','61')); raise exception 'FAIL: altered idempotency payload accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.practice_attempts default values; raise exception 'FAIL: direct ledger insert'; exception when insufficient_privilege then null; end;
 begin update public.daily_activity set session_count=99; raise exception 'FAIL: direct activity write'; exception when insufficient_privilege then null; end;
 begin insert into public.corrections default values; raise exception 'FAIL: direct correction insert'; exception when insufficient_privilege then null; end;
 p:=jsonb_set(p,'{id}','"a10c0000-0000-4000-8000-000000000011"');
 r:=public.save_practice_attempt(p);
 if r->>'attempt_number'<>'2' then raise exception 'FAIL: retry number'; end if;
 if (select total_sessions from public.user_stats)<>1 or (select total_attempts from public.user_stats)<>2 then raise exception 'FAIL: session vs attempt totals'; end if;
 if (select session_count from public.daily_activity)<>1 or (select speaking_seconds from public.daily_activity)<>120 then raise exception 'FAIL: day aggregation'; end if;
 p:=jsonb_set(jsonb_set(p,'{id}','"a10c0000-0000-4000-8000-000000000012"'),'{session_id}','"a10c0000-0000-4000-8000-000000000021"');
 p:=jsonb_set(p,'{analysis,corrections,0,category}','"invalid"');
 begin perform public.save_practice_attempt(p); raise exception 'FAIL: malformed correction accepted'; exception when check_violation then null; end;
 if (select count(*) from public.practice_sessions)<>1 or (select count(*) from public.practice_attempts)<>2 then raise exception 'FAIL: failed save left partial rows'; end if;
end;$$;
select set_config('request.jwt.claims','{"sub":"b10c0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$declare p jsonb; begin
 if (select count(*) from public.practice_sessions)<>0 or (select count(*) from public.practice_attempts)<>0 or (select count(*) from public.corrections)<>0 or (select count(*) from public.daily_activity)<>0 then raise exception 'FAIL: User B can read User A practice'; end if;
 if (select total_attempts from public.user_stats)<>0 then raise exception 'FAIL: User B sees User A stats'; end if;
 select payload into p from pg_temp.spikoo_test_payload;
 begin perform public.save_practice_attempt(p); raise exception 'FAIL: foreign attempt reused'; exception when insufficient_privilege then null; end;
 p:=jsonb_set(p,'{id}','"b10c0000-0000-4000-8000-000000000010"');
 begin perform public.save_practice_attempt(p); raise exception 'FAIL: foreign session reused'; exception when insufficient_privilege then null; end;
 p:=jsonb_set(p,'{session_id}','"b10c0000-0000-4000-8000-000000000020"');
 perform public.save_practice_attempt(p);
 if (select count(*) from public.practice_attempts)<>1 or (select count(*) from public.corrections)<>1 then raise exception 'FAIL: User B own save'; end if;
end;$$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$begin
 begin perform * from public.profiles; raise exception 'FAIL: anonymous profile access'; exception when insufficient_privilege then null; end;
 begin perform public.save_practice_attempt('{}'); raise exception 'FAIL: anonymous RPC'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
rollback;
select 'PASS: two-user isolation, anonymous denial, atomic save, idempotency, retries, real activity and streaks. All test identities rolled back.' as result;
