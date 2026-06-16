-- Create the table for saving user resumes
CREATE TABLE public.resumes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Resume',
  resume_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own resumes
CREATE POLICY "Users can view their own resumes" 
ON public.resumes FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow users to insert their own resumes
CREATE POLICY "Users can create their own resumes" 
ON public.resumes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own resumes
CREATE POLICY "Users can update their own resumes" 
ON public.resumes FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete their own resumes" 
ON public.resumes FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
