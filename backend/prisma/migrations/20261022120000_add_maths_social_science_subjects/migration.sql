INSERT INTO "subjects" ("id", "code", "name")
VALUES
  ('d9f342c1-7fa4-4a43-8f9e-12f74e870201', 'MAT', 'Maths'),
  ('d9f342c1-7fa4-4a43-8f9e-12f74e870202', 'SOC', 'Social Science')
ON CONFLICT DO NOTHING;
