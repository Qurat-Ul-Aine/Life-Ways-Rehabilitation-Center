-- Add MISSED and CONFIRMED to appointment_status enum
ALTER TYPE "appointment_status" ADD VALUE IF NOT EXISTS 'MISSED';
ALTER TYPE "appointment_status" ADD VALUE IF NOT EXISTS 'CONFIRMED';
