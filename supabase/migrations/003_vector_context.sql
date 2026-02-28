-- Migration 003: Add 13-Dimensional Vector Context to assets
-- Run this in Supabase SQL Editor

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS vector_context JSONB DEFAULT '{}';

-- Index for querying by vector scores
CREATE INDEX IF NOT EXISTS idx_assets_vector_context
  ON assets USING gin(vector_context);

-- Add discovery_method values for integrations
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_discovery_method_check;

ALTER TABLE assets
  ADD CONSTRAINT assets_discovery_method_check
    CHECK (discovery_method IN ('agent','snmp','ping','arp','dns','manual','ad_sync','ldap_sync'));

COMMENT ON COLUMN assets.vector_context IS
  '13-dimensional AC-COS context vector: network, identity, behavior, temporal, threat_intel, vulnerability, criticality, compliance, geo, traffic, application, patch, privilege';
