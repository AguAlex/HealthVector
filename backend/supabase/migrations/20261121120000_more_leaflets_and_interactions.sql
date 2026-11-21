-- Expand default leaflets to 16 drugs and seed known interactions between them.

INSERT INTO leaflets (user_id, drug_name, leaflet_text, sections)
SELECT NULL, drug_name, leaflet_text, sections
FROM (VALUES
  (
    'Simvastatin',
    'Simvastatina este un statin indicat pentru hipercolesterolemie. Doza uzuală se administrează seara. Asocierea cu inhibitori puternici de CYP3A4, inclusiv claritromicina, este contraindicată.',
    '{"4.1": "Indicații: Hipercolesterolemie, prevenție cardiovasculară", "4.2": "Posologie: O dată pe zi, de obicei seara, la 18:00", "4.5": "Interacțiuni: Interacțiune majoră cu Clarithromycin; precauție cu Amiodarone", "4.8": "Reacții adverse: Mialgie, rhabdomyoliză rară, creșterea transaminazelor"}'::jsonb
  ),
  (
    'Clarithromycin',
    'Claritromicina este un macrolid utilizat în infecții respiratorii și eradicarea Helicobacter pylori. Inhibă CYP3A4 și P-glicoproteina. Doza uzuală la adulți este de 250-500 mg la 12 ore.',
    '{"4.1": "Indicații: Infecții bacteriene ale tractului respirator, H. pylori", "4.2": "Posologie: Adulți 250-500 mg la 12 ore", "4.5": "Interacțiuni: Crește expunerea la Simvastatin și Digoxin; precauție cu Amiodarone", "4.8": "Reacții adverse: Gust metalic, diaree, prelungirea QT"}'::jsonb
  ),
  (
    'Fluoxetine',
    'Fluoxetina este un ISRS indicat în depresie și tulburare obsesiv-compulsivă. Se administrează de obicei o dată pe zi dimineața. Potențează efectul anticoagulantelor și al altor serotonergice.',
    '{"4.1": "Indicații: Depresie, tulburare obsesiv-compulsivă", "4.2": "Posologie: O dată pe zi, de obicei dimineața", "4.5": "Interacțiuni: Interacțiune majoră cu Warfarina; sindrom serotoninergic cu Sertraline sau Lithium", "4.8": "Reacții adverse: Insomnie, greață, disfuncție sexuală"}'::jsonb
  ),
  (
    'Sertraline',
    'Sertralina este un ISRS indicat în depresie și tulburări de anxietate. Doza se administrează o dată pe zi. Asocierea cu antiagregante sau alte ISRS crește riscul de sângerare și de sindrom serotoninergic.',
    '{"4.1": "Indicații: Depresie, tulburare de panică, TOC", "4.2": "Posologie: O dată pe zi", "4.5": "Interacțiuni: Interacțiune majoră cu Aspirina; sindrom serotoninergic cu Fluoxetine sau Lithium", "4.8": "Reacții adverse: Greață, diaree, insomnie"}'::jsonb
  ),
  (
    'Digoxin',
    'Digoxina este un glicozid cardiac folosit în fibrilație atrială și insuficiență cardiacă. Are fereastră terapeutică îngustă. Nivelurile pot crește la asociere cu Amiodarone sau Clarithromycin.',
    '{"4.1": "Indicații: Fibrilație atrială, insuficiență cardiacă", "4.2": "Posologie: O dată pe zi", "4.5": "Interacțiuni: Interacțiune majoră cu Amiodarone și Clarithromycin — risc de toxicitate digitalică", "4.8": "Reacții adverse: Greață, aritmii, tulburări vizuale"}'::jsonb
  ),
  (
    'Lisinopril',
    'Lisinoprilul este un inhibitor ECA indicat în hipertensiune și insuficiență cardiacă. Doza se administrează o dată pe zi. Asocierea cu AINS, spironolactonă sau suplimente de potasiu crește riscul de hiperpotasemie și afectare renală.',
    '{"4.1": "Indicații: Hipertensiune arterială, insuficiență cardiacă", "4.2": "Posologie: O dată pe zi", "4.5": "Interacțiuni: Interacțiune majoră cu Ibuprofen, Spironolactone și Potassium chloride", "4.8": "Reacții adverse: Tuse, hipotensiune, hiperpotasemie"}'::jsonb
  ),
  (
    'Spironolactone',
    'Spironolactona este un diuretic economisitor de potasiu indicat în insuficiență cardiacă și hiperaldosteronism. Asocierea cu inhibitori ECA sau potasiu poate produce hiperpotasemie severă.',
    '{"4.1": "Indicații: Insuficiență cardiacă, hiperaldosteronism, edeme", "4.2": "Posologie: O dată pe zi", "4.5": "Interacțiuni: Interacțiune majoră cu Lisinopril și Potassium chloride", "4.8": "Reacții adverse: Hiperpotasemie, ginecomastie, hipotensiune"}'::jsonb
  ),
  (
    'Potassium chloride',
    'Clorura de potasiu este un supliment electrolitic pentru hipokaliemie. Nu se asociază cu diuretice economisitoare de potasiu sau inhibitori ECA fără monitorizare.',
    '{"4.1": "Indicații: Corectarea hipokaliemiei", "4.2": "Posologie: De obicei de două ori pe zi", "4.5": "Interacțiuni: Interacțiune majoră cu Lisinopril și Spironolactone — hiperpotasemie", "4.8": "Reacții adverse: Iritație gastrică, hiperpotasemie"}'::jsonb
  ),
  (
    'Methotrexate',
    'Metotrexatul este un antimetabolit folosit în doze mici în poliartrită reumatoidă. Eliminarea renală poate fi redusă de AINS, cu risc de toxicitate.',
    '{"4.1": "Indicații: Poliartrită reumatoidă, psoriazis", "4.2": "Posologie: O dată pe zi în acest prototip (în practică adesea săptămânal)", "4.5": "Interacțiuni: Interacțiune majoră cu Ibuprofen — risc de toxicitate", "4.8": "Reacții adverse: Mielosupresie, mucozită, hepatotoxicitate"}'::jsonb
  ),
  (
    'Ciprofloxacin',
    'Ciprofloxacina este o fluorochinolonă. Poate prelungi QT și poate potența warfarina. Doza uzuală la adulți este de două ori pe zi.',
    '{"4.1": "Indicații: Infecții urinare și digestive selectate", "4.2": "Posologie: De două ori pe zi", "4.5": "Interacțiuni: Interacțiune majoră cu Warfarina și Amiodarone", "4.8": "Reacții adverse: Tendinopatie, prelungirea QT, diaree"}'::jsonb
  ),
  (
    'Amiodarone',
    'Amiodarona este un antiaritimic de clasă III. Inhibă multiple CYP și poate crește concentrațiile de digoxină și statine. Asocierea cu fluorochinolone crește riscul de QT prelungit.',
    '{"4.1": "Indicații: Aritmii ventriculare, fibrilație atrială", "4.2": "Posologie: O dată pe zi după faza de încărcare", "4.5": "Interacțiuni: Interacțiune majoră cu Digoxin și Ciprofloxacin; precauție cu Simvastatin", "4.8": "Reacții adverse: Toxicitate tiroidiană și pulmonară, prelungirea QT"}'::jsonb
  ),
  (
    'Lithium',
    'Litiul este un stabilizator al dispoziției cu fereastră terapeutică îngustă. AINS reduc clearance-ul renal. Asocierea cu ISRS crește riscul de sindrom serotoninergic.',
    '{"4.1": "Indicații: Tulburare bipolară", "4.2": "Posologie: De obicei de două ori pe zi", "4.5": "Interacțiuni: Interacțiune majoră cu Ibuprofen și Sertraline; precauție cu Fluoxetine", "4.8": "Reacții adverse: Tremor, polidipsie, toxicitate la niveluri ridicate"}'::jsonb
  )
) AS seed(drug_name, leaflet_text, sections)
WHERE NOT EXISTS (
  SELECT 1 FROM leaflets existing
  WHERE existing.user_id IS NULL AND LOWER(existing.drug_name) = LOWER(seed.drug_name)
);

INSERT INTO known_interactions (drug_a, drug_b, severity, warning_message)
VALUES
    ('warfarin', 'fluoxetine', 'high', 'High-severity interaction: Fluoxetine can increase Warfarin effect and bleeding risk. Consult a healthcare professional.'),
    ('warfarin', 'ciprofloxacin', 'high', 'High-severity interaction: Ciprofloxacin may potentiate Warfarin and increase INR. Consult a healthcare professional.'),
    ('aspirin', 'ibuprofen', 'moderate', 'Potential interaction: Ibuprofen may reduce the antiplatelet effect of Aspirin and increase gastrointestinal bleeding risk.'),
    ('aspirin', 'sertraline', 'high', 'High-severity interaction: Aspirin with Sertraline increases bleeding risk. Consult a healthcare professional.'),
    ('ibuprofen', 'lisinopril', 'high', 'High-severity interaction: Ibuprofen may reduce Lisinopril effect and increase kidney-injury risk. Consult a healthcare professional.'),
    ('ibuprofen', 'methotrexate', 'high', 'High-severity interaction: Ibuprofen can raise Methotrexate levels and toxicity. Consult a healthcare professional.'),
    ('ibuprofen', 'lithium', 'high', 'High-severity interaction: Ibuprofen can reduce Lithium clearance and cause toxicity. Consult a healthcare professional.'),
    ('lisinopril', 'spironolactone', 'high', 'High-severity interaction: Lisinopril with Spironolactone can cause hyperkalemia. Consult a healthcare professional.'),
    ('lisinopril', 'potassium chloride', 'high', 'High-severity interaction: Lisinopril with Potassium chloride can cause hyperkalemia. Consult a healthcare professional.'),
    ('spironolactone', 'potassium chloride', 'high', 'High-severity interaction: Spironolactone with Potassium chloride can cause dangerous hyperkalemia. Consult a healthcare professional.'),
    ('simvastatin', 'clarithromycin', 'high', 'High-severity interaction: Clarithromycin can greatly increase Simvastatin exposure and rhabdomyolysis risk. Consult a healthcare professional.'),
    ('simvastatin', 'amiodarone', 'moderate', 'Potential interaction: Amiodarone may increase Simvastatin levels. Review the dose with a pharmacist.'),
    ('clarithromycin', 'digoxin', 'high', 'High-severity interaction: Clarithromycin can raise Digoxin levels. Consult a healthcare professional.'),
    ('amiodarone', 'digoxin', 'high', 'High-severity interaction: Amiodarone increases Digoxin concentration. Consult a healthcare professional.'),
    ('fluoxetine', 'sertraline', 'high', 'High-severity interaction: Combining Fluoxetine and Sertraline increases serotonin-syndrome risk. Consult a healthcare professional.'),
    ('fluoxetine', 'lithium', 'moderate', 'Potential interaction: Fluoxetine with Lithium may increase serotonergic and neurotoxicity risk. Review with a pharmacist.'),
    ('sertraline', 'lithium', 'high', 'High-severity interaction: Sertraline with Lithium increases serotonin-syndrome and neurotoxicity risk. Consult a healthcare professional.'),
    ('ciprofloxacin', 'amiodarone', 'high', 'High-severity interaction: Ciprofloxacin with Amiodarone can prolong QT interval. Consult a healthcare professional.')
ON CONFLICT (drug_a, drug_b) DO NOTHING;
