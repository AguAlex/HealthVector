UPDATE leaflets
SET sections = COALESCE(sections, '{}'::jsonb) || jsonb_build_object(
  '4.8',
  'Reacții adverse: Iritație gastrică, ulcere gastrice, risc de sângerare'
)
WHERE lower(drug_name) = 'aspirin'
  AND (sections->>'4.8' IS NULL OR btrim(sections->>'4.8') = '');
