-- Add show_total flag to quotes (controls whether total is shown in shared/printed quote)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS show_total boolean DEFAULT true;
