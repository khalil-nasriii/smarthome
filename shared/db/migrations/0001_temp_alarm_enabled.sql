ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "temp_alarm_enabled" boolean NOT NULL DEFAULT false;
