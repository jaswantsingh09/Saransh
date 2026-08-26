-- Migration: Add Yantra API Key to settings table
-- Adds support for the Yantra provider (intelligaia's hosted, OpenAI-compatible LLM)

ALTER TABLE settings ADD COLUMN yantraApiKey TEXT;
