-- Migration: Add answered_count column to answer_sheet_students
-- Description: Adds a column to track the number of questions answered by each student

ALTER TABLE answer_sheet_students
ADD COLUMN answered_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE answer_sheet_students
ADD CONSTRAINT answered_count_non_negative CHECK (answered_count >= 0);

COMMENT ON COLUMN answer_sheet_students.answered_count IS 'Number of questions answered by the student';
