-- Migration: Add blank_count and double_marked_count columns to answer_sheet_students
-- Description: Adds columns to track blank answers and double-marked questions

ALTER TABLE answer_sheet_students
ADD COLUMN blank_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN double_marked_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE answer_sheet_students
ADD CONSTRAINT blank_count_non_negative CHECK (blank_count >= 0),
ADD CONSTRAINT double_marked_count_non_negative CHECK (double_marked_count >= 0);

COMMENT ON COLUMN answer_sheet_students.blank_count IS 'Number of questions left blank by the student';
COMMENT ON COLUMN answer_sheet_students.double_marked_count IS 'Number of questions with multiple answers marked';
