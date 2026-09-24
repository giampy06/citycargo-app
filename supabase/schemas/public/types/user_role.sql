CREATE TYPE "public"."user_role" AS ENUM (
  'admin',
  'autista_dipendente',
  'padroncino'
);

GRANT USAGE ON TYPE "public"."user_role" TO "postgres";
