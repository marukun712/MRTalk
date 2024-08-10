alter table "public"."characters" add column "speaker_id" smallint default '0'::smallint;

alter table "public"."profiles" alter column "current_character" set default '564362c2-a57d-474d-b56b-9a89573629a5'::uuid;


