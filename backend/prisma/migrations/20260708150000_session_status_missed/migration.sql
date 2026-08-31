-- Add MISSED to therapy session_status enum (legacy add-session dialog + structured sessions)
ALTER TYPE "session_status" ADD VALUE IF NOT EXISTS 'MISSED';
