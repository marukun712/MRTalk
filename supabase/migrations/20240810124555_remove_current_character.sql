alter table "public"."profiles" drop constraint "profiles_current_character_fkey";

alter table "public"."characters" alter column "is_public" set not null;

alter table "public"."characters" alter column "model_url" set not null;

alter table "public"."characters" alter column "name" set not null;

alter table "public"."characters" alter column "speaker_id" set not null;

alter table "public"."favorites" alter column "model_id" set not null;

alter table "public"."favorites" alter column "user_id" set not null;

alter table "public"."profiles" drop column "current_character";

alter table "public"."profiles" alter column "avatar_url" set not null;

alter table "public"."profiles" alter column "full_name" set not null;


