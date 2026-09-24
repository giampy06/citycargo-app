CREATE TYPE "public"."maint_type" AS ENUM (
  'tagliando',
  'freni',
  'gomme',
  'straordinaria',
  'carrozzeria',
  'clima_elettrauto'
);

GRANT USAGE ON TYPE "public"."maint_type" TO "postgres";
