DO $$
DECLARE
  v_admin_id UUID := 'b8f222fc-e1f3-49a2-acde-2e5ef4f0d378';
  v_emp_id UUID := '8c6b5cc0-c0da-4e5e-8ef2-725b3b4a5d5e';
  v_mgr_id UUID := '6327ee2f-ce4e-4d60-a49c-035baded4f1f';
BEGIN
  -- We already created the auth.users via JS
  
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES 
    (v_admin_id, 'alex.rivera@axionhr.com', 'Alex Rivera', 'admin', 'active'),
    (v_emp_id, 'sam.employee@axionhr.com', 'Sam Employee', 'employee', 'active'),
    (v_mgr_id, 'jordan.manager@axionhr.com', 'Jordan Manager', 'manager', 'active')
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email, 
    full_name = EXCLUDED.full_name, 
    role = EXCLUDED.role;
    
  INSERT INTO public.scheduled_meetings (organizer_id, title, start_time, end_time, attendees, is_compliant)
  VALUES 
    (v_mgr_id, 'Q3 Roadmap Planning', '2026-08-10T10:00:00Z', '2026-08-10T11:00:00Z', jsonb_build_array(v_emp_id, v_admin_id), true);
END
$$;
