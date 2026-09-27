-- Importa l'elenco reale dei 70 furgoni della flotta (da "Elenco targhe.xlsx") e aggiunge
-- alla scheda furgone: intestazione, anno, categoria (classe emissioni), alimentazione,
-- responsabile. Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi
-- (ON CONFLICT aggiorna solo questi campi anagrafici, non tocca stato/km/scadenze esistenti).

-- 1. Nuovi campi anagrafici -----------------------------------------------------

ALTER TABLE public.veicoli ADD COLUMN IF NOT EXISTS intestazione text;
ALTER TABLE public.veicoli ADD COLUMN IF NOT EXISTS anno integer;
ALTER TABLE public.veicoli ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.veicoli ADD COLUMN IF NOT EXISTS alimentazione text;
ALTER TABLE public.veicoli ADD COLUMN IF NOT EXISTS responsabile text;
COMMENT ON COLUMN public.veicoli.intestazione IS 'A chi e intestato il mezzo (es. CC = City Cargo, o altra ragione sociale/leasing).';

-- 2. Il foglio importato non contiene queste date/km: le rendiamo facoltative -----
--    (prima erano obbligatorie alla creazione manuale di un singolo furgone;
--    l'admin le completera' mezzo per mezzo dalla Scheda Furgone).

ALTER TABLE public.veicoli ALTER COLUMN data_scadenza_assicurazione DROP NOT NULL;
ALTER TABLE public.veicoli ALTER COLUMN data_scadenza_revisione DROP NOT NULL;
ALTER TABLE public.veicoli ALTER COLUMN km_prossimo_tagliando DROP NOT NULL;

-- 3. Importa i 70 furgoni ---------------------------------------------------------
--    Se una targa esiste gia' (es. il furgone di prova FL007PH), aggiorna SOLO i
--    campi anagrafici nuovi: non tocca stato, km, scadenze o documenti gia' inseriti.

INSERT INTO public.veicoli (targa, modello, intestazione, anno, categoria, alimentazione, responsabile, stato, km_attuali)
VALUES
  ('DT840VE', 'Mercedes Sprinter', 'CC', 2009, 'Euro 4', 'Metano', 'Johnny', 'disponibile', 0),
  ('EB150NN', 'Mercedes Sprinter', 'CC', 2010, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EB820RS', 'Mercedes Sprinter', 'AZ', 2010, 'Euro 5', 'Diesel', 'Johnny', 'disponibile', 0),
  ('EC755GL', 'Fiat Doblo', 'CC', 2010, 'Euro 4', 'Benzina', 'Edgar', 'disponibile', 0),
  ('ED206BZ', 'Renault Master', 'CC', 2010, 'Euro 5', 'Diesel', 'Alexia', 'disponibile', 0),
  ('EF676KM', 'Renault Master', 'CC', 2011, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EG782NT', 'Renault Master', 'CC', 2011, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EJ370JJ', 'Mercedes Sprinter', 'CC', 2011, 'Euro 5', 'Diesel', 'Edenor', 'disponibile', 0),
  ('EJ504RC', 'Mercedes Sprinter', 'CC', 2011, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EJ571TE', 'IVECO Daily', 'CC', 2011, 'Euro 4', 'Diesel', 'Javier', 'disponibile', 0),
  ('EK148YL', 'IVECO Daily', 'CC', 2012, 'Euro 5', 'Metano', 'Edgar', 'disponibile', 0),
  ('EK276EH', 'Renault Master', 'CC', 2011, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EM149KN', 'IVECO Daily', 'CC', 2012, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EP556KG', 'IVECO Daily', 'CC', 2012, 'Euro 5', 'Diesel', 'Joao', 'disponibile', 0),
  ('ET276TH', 'IVECO Daily', 'CC', 2015, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('ET547JD', 'Renault Master', 'Alfa', 2014, 'Euro 5', 'Diesel', 'Cristina', 'disponibile', 0),
  ('ET606FX', 'Mercedes Sprinter', 'CC', 2013, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EV448ZD', 'IVECO Daily', 'CC', 2014, 'Euro 5', 'Diesel', 'Cristina', 'disponibile', 0),
  ('EV838DN', 'IVECO Daily', 'CC', 2014, 'Euro 5', 'Metano', 'Edgar', 'disponibile', 0),
  ('EW406YV', 'Mercedes Sprinter', 'CC', 2014, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EW414CG', 'IVECO Daily', 'CC', 2014, 'Euro 6', 'Diesel', 'Motrice', 'disponibile', 0),
  ('EW467YV', 'Mercedes Sprinter', 'CC', 2014, 'Euro 5', 'Diesel', 'Johnny', 'disponibile', 0),
  ('EW470YV', 'Mercedes Sprinter', 'CC', 2014, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EX058CC', 'IVECO Daily', 'CC', 2012, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EX816NL', 'IVECO Daily', 'CC', 2014, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('EY389DF', 'IVECO Daily', 'CC', 2013, 'Euro 5', 'Diesel', 'Manuel', 'disponibile', 0),
  ('EY955YE', 'IVECO Daily', 'CC', 2015, 'Euro 5', 'Diesel', 'Javier', 'disponibile', 0),
  ('EY963WB', 'IVECO Daily', 'CC', 2015, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FB665CE', 'Ford Transit', 'CC', 2015, 'Euro 5', 'Diesel', 'Mosca', 'disponibile', 0),
  ('FC099FF', 'IVECO Daily', 'CC', 2015, 'Euro 5', 'Diesel', 'Johnny', 'disponibile', 0),
  ('FC757KD', 'Renault Master', 'TL', 2016, 'Euro 5', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FG702XD', 'Ford Transit', 'CC', 2016, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FH285DD', 'Ford Transit', 'CC', 2017, 'Euro 6', 'Diesel', 'Juan', 'disponibile', 0),
  ('FH993SL', 'Ford Transit', 'CC', 2017, 'Euro 6', 'Diesel', 'Jordy', 'disponibile', 0),
  ('FJ278FM', 'Ford Transit', 'CC', 2017, 'Euro 5', 'Metano', 'Quispe', 'disponibile', 0),
  ('FJ658ZP', 'IVECO Daily', 'CC', 2017, 'Euro 6', 'Diesel', 'Cardenas', 'disponibile', 0),
  ('FJ782BN', 'IVECO Daily', 'CC', 2017, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FJ857BN', 'IVECO Daily', 'CC', 2017, 'Euro 6', 'Diesel', 'Javier', 'disponibile', 0),
  ('FK541LV', 'IVECO Daily', 'CC', 2017, 'Euro 6', 'Diesel', 'Alexander', 'disponibile', 0),
  ('FL007PH', 'IVECO Daily', 'CC', 2018, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FL146GL', 'IVECO Daily', 'CC', 2017, 'Euro 6', 'Metano', 'Miriam', 'disponibile', 0),
  ('FL302SA', 'Renault Master', 'CC', 2017, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FL758GC', 'Mercedes Sprinter', 'CC', 2017, 'Euro 6', 'Diesel', 'Javier', 'disponibile', 0),
  ('FM129SX', 'Ford Transit', 'CC', 2017, 'Euro 6', 'Diesel', 'Cornejo', 'disponibile', 0),
  ('FM411VE', 'Renault Master', 'CC', 2018, 'Euro 6', 'Diesel', 'Jefferson', 'disponibile', 0),
  ('FM517RK', 'Mercedes Sprinter', 'CC', 2018, 'Euro 6', 'Diesel', 'Jonathan', 'disponibile', 0),
  ('FM916ML', 'Mercedes Sprinter', 'CC', 2018, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FN044HF', 'IVECO Daily', 'CC', 2018, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FN291RF', 'IVECO Daily', 'CC', 2018, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('FS236MH', 'IVECO Daily', 'CC', 2018, 'Euro 6', 'Diesel', 'Yaranga', 'disponibile', 0),
  ('FT043NS', 'IVECO Daily', 'CC', 2016, 'Euro 5', 'Diesel', 'Carlos', 'disponibile', 0),
  ('FV670FV', 'IVECO Daily', 'CC', 2015, 'Euro 5', 'Diesel', 'Daniel', 'disponibile', 0),
  ('FV704LR', 'Renault Master', 'CC', NULL, 'Euro 6', 'Diesel', 'Saona', 'disponibile', 0),
  ('FW013ER', 'IVECO Daily', 'CC', 2019, 'Euro 6', 'Diesel', 'Walter', 'disponibile', 0),
  ('FW187NT', 'Mercedes Sprinter', 'CC', 2019, 'Euro 6', 'Diesel', 'Edenor', 'disponibile', 0),
  ('FZ224YC', 'IVECO Daily', 'CC', 2020, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('GC584ZF', 'IVECO Daily', 'CC', 2021, 'Euro 6', 'Metano', 'Carlos', 'disponibile', 0),
  ('GC708DF', 'Ford Transit', 'CC', 2020, 'Euro 6', 'Diesel', 'Charlie', 'disponibile', 0),
  ('GC812NZ', 'Ford Transit', 'CC', 2020, 'Euro 6', 'Diesel', 'Quispe', 'disponibile', 0),
  ('GC939HK', 'IVECO Daily', 'CC', 2017, 'Euro 6', 'Diesel', 'Baccarin', 'disponibile', 0),
  ('GD595AS', 'Renault Master', 'CC', 2020, 'Euro 6', 'Diesel', 'Ramon', 'disponibile', 0),
  ('GD764DT', 'Renault Master', 'CC', 2021, 'Euro 6', 'Diesel', 'Cristina', 'disponibile', 0),
  ('GD986ZZ', 'IVECO Daily', 'CC', 2017, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('GF007TH', 'IVECO Daily', 'Marchesi', 2022, 'Euro 6', 'Diesel', 'Pedro', 'disponibile', 0),
  ('GF893JK', 'IVECO Daily', 'CC', 2019, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('GG092SH', 'Mercedes Sprinter', 'CC', 2014, 'Euro 6', 'Metano', 'Alessandro', 'disponibile', 0),
  ('GS276AP', 'IVECO Daily', 'GSA', 2021, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('GY257DV', 'IVECO Daily', 'GSA', 2021, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('HD933FY', 'IVECO Daily', 'CC', 2018, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0),
  ('GH964AV', 'Renault Master', 'CC', 2022, 'Euro 6', 'Diesel', 'Edgar', 'disponibile', 0)
ON CONFLICT (targa) DO UPDATE SET
  modello = EXCLUDED.modello,
  intestazione = EXCLUDED.intestazione,
  anno = EXCLUDED.anno,
  categoria = EXCLUDED.categoria,
  alimentazione = EXCLUDED.alimentazione,
  responsabile = EXCLUDED.responsabile;
