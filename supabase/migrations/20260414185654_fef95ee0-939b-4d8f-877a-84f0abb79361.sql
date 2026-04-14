
-- Drop existing policies that reference teacher_id or video_id
DROP POLICY IF EXISTS "Teachers can create feedback" ON public.feedback;
DROP POLICY IF EXISTS "Teachers can view feedback they gave" ON public.feedback;
DROP POLICY IF EXISTS "Students can view their own feedback" ON public.feedback;

-- Remove columns
ALTER TABLE public.feedback DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE public.feedback DROP COLUMN IF EXISTS video_id;

-- Recreate policies without teacher_id
CREATE POLICY "Students can view their own feedback"
ON public.feedback
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Authenticated users can create feedback"
ON public.feedback
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
