CREATE TYPE "public"."shift_type" AS ENUM (
  'giornata_intera',
  'mezza_giornata'
);

GRANT USAGE ON TYPE "public"."shift_type" TO "postgres";
