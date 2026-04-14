
-- Create reference_materials table for teacher uploads
CREATE TABLE public.reference_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reference_video', 'sollukattu_audio')),
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reference_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert their own materials"
ON public.reference_materials FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own materials"
ON public.reference_materials FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own materials"
ON public.reference_materials FOR DELETE
USING (auth.uid() = teacher_id);

-- Students can view all reference materials
CREATE POLICY "Students can view reference materials"
ON public.reference_materials FOR SELECT
USING (true);

-- Create storage bucket for reference materials
INSERT INTO storage.buckets (id, name, public) VALUES ('reference-materials', 'reference-materials', true);

-- Storage policies
CREATE POLICY "Anyone can view reference materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'reference-materials');

CREATE POLICY "Teachers can upload reference materials"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reference-materials');

CREATE POLICY "Teachers can delete reference materials"
ON storage.objects FOR DELETE
USING (bucket_id = 'reference-materials');
