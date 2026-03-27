-- Change Feriado.fecha from DateTime to String (calendar date YYYY-MM-DD)
ALTER TABLE "Feriado" ALTER COLUMN "fecha" TYPE VARCHAR(10);
