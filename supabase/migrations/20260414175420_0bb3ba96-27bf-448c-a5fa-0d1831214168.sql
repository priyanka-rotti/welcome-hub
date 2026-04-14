
ALTER TABLE public.profiles ADD COLUMN school_name TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, student_name, contact_email, role, classes, school_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'student_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'classes')),
      '{}'
    ),
    COALESCE(NEW.raw_user_meta_data->>'school_name', '')
  );
  RETURN NEW;
END;
$$;
