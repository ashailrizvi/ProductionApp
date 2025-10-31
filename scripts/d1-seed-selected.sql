-- Generated SQL: selected tables from data/*.json
-- Safe for Cloudflare D1 editor (no explicit transactions)
PRAGMA foreign_keys = OFF;
-- Ensure generic kv table exists (used by /tables/* API)
CREATE TABLE IF NOT EXISTS kv (
  table_name TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (table_name, id)
);
CREATE INDEX IF NOT EXISTS idx_kv_table ON kv(table_name);

-- Physical tables used by this seed (for Cloudflare D1 editor convenience)
-- Note: the app primarily uses the generic kv table via /tables/* endpoints.
-- These tables are created so this seed can execute without missing-table errors.

-- services
CREATE TABLE IF NOT EXISTS services (
  serviceCode TEXT,
  name TEXT,
  category TEXT,
  unit TEXT,
  baseRate REAL,
  currency TEXT,
  contentTypes TEXT,
  teamRoles TEXT,
  isOptional INTEGER,
  isNegotiable INTEGER,
  minQty INTEGER,
  maxQty INTEGER,
  includes TEXT,
  notes TEXT,
  id TEXT PRIMARY KEY
);

-- bundles
CREATE TABLE IF NOT EXISTS bundles (
  bundleCode TEXT,
  name TEXT,
  parentServiceId TEXT,
  description TEXT,
  unit TEXT,
  id TEXT PRIMARY KEY
);

-- bundle_items
CREATE TABLE IF NOT EXISTS bundle_items (
  bundleId TEXT,
  childServiceId TEXT,
  childQty INTEGER,
  isOptional INTEGER,
  defaultSelected INTEGER,
  include INTEGER,
  notes TEXT,
  id TEXT PRIMARY KEY
);

-- company_templates
CREATE TABLE IF NOT EXISTS company_templates (
  name TEXT,
  companyName TEXT,
  companyPhone TEXT,
  companyEmail TEXT,
  companyLogo TEXT,
  companyAddress TEXT,
  defaultCurrency TEXT,
  taxRate REAL,
  headerBuffer REAL,
  discountType TEXT,
  discountValue REAL,
  quotationTerms TEXT,
  invoiceTerms TEXT,
  quotationNotes TEXT,
  invoiceNotes TEXT,
  isDefault INTEGER,
  isActive INTEGER,
  id TEXT PRIMARY KEY
);

-- currency_rates
CREATE TABLE IF NOT EXISTS currency_rates (
  id TEXT PRIMARY KEY,
  fromCur TEXT,
  toCur TEXT,
  rate REAL,
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER
);
-- Table: settings (stored in generic kv)
-- The app uses a single kv table, not a physical settings table.
-- Wipe existing kv rows for settings and insert the JSON payload.
DELETE FROM kv WHERE table_name = 'settings';
INSERT OR REPLACE INTO kv (table_name, id, data) VALUES (
  'settings',
  '1',
  '{"id":"1","defaultCurrency":"PKR","baseCurrency":"PKR","taxRate":0.15,"discountType":"None","discountValue":0,"headerBuffer":0.5,"quotationTerms":"1. This quotation is valid for 30 days from the date of issue.\n2. All rates are exclusive of applicable taxes unless stated otherwise.\n3. 50% advance payment required to commence work.\n4. Final payment due within 15 days of project completion.\n5. Additional revisions beyond scope will be charged separately.\n6. Travel and accommodation costs (if required) will be charged extra.\n7. Client to provide necessary permissions and clearances for shooting.","invoiceTerms":"1. Payment due within 30 days of invoice date.\n2. All payments to be made by cheque in the name of the company or credited online to the following bank account: \n3. All bank charges to be borne by the client.\n4. Goods remain the property of the company until full payment is received.\n5. Any disputes must be raised within 7 days of invoice receipt.","quotationNotes":"Thank you for considering our services. We look forward to working with you on this project.","invoiceNotes":"Thank you for your business. Please remit payment as per the terms mentioned above.","gs_project_id":"9d47194e-8b79-4d85-b1d4-896740aa7dee","gs_table_name":"settings","created_at":1760708994501,"updated_at":1760800570508,"_rid":"pBtjAL8RWCfTVCYAAAAAAA==","_self":"dbs/pBtjAA==/colls/pBtjAL8RWCc=/docs/pBtjAL8RWCfTVCYAAAAAAA==/","_etag":"\"7904c7dc-0000-0800-0000-68f3af3a0000\"","_attachments":"attachments/","_ts":1760800570,"customUnits":["per asset"]}'
);

-- Table: services
DELETE FROM services;
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-DOP-A', 'Director of Photography (DOP) -A', 'Crew', 'per day', 300000, 'PKR', 'All Video', 'DOP', 0, 0, NULL, NULL, '', 'External', 'mhdfuqww11srqkeh1nsk');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-DOP-B', 'Director of Photography (DOP) -B', 'Crew', 'per day', 150000, 'PKR', 'All Video', 'DOP', 0, 0, NULL, NULL, '', 'External', 'mhdfuqx2toqeuxuk9fa');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-DOP-C', 'Director of Photography (DOP) -C', 'Crew', 'per day', 50000, 'PKR', 'All Video', 'DOP', 0, 0, NULL, NULL, '', 'External', 'mhdfuqx6hbqe9k61685');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-GAFFER', 'Gaffer', 'Crew', 'per day', 30000, 'PKR', 'All Video', 'Gaffer', 0, 0, NULL, NULL, '', 'External', 'mhdfuqx94lxw9nx5082');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-FOCUS', 'Focus Puller', 'Crew', 'per day', 25000, 'PKR', 'All Video', 'Focus Puller', 0, 0, NULL, NULL, '', 'External', 'mhdfuqxgnfhpcqmw5um');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-SOUND-A', 'Location Sound Recordist -A', 'Crew', 'per day', 40000, 'PKR', 'All Video', 'Sound Recordist', 0, 0, NULL, NULL, '', 'External', 'mhdfuqxkhkqr3ed8mvq');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-SOUND-B', 'Location Sound Recordist -B', 'Crew', 'per day', 10000, 'PKR', 'All Video', 'Sound Recordist', 0, 0, NULL, NULL, '', 'External', 'mhdfuqxopr0qxrtzjf');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-DIT', 'DIT / Media Manager', 'Crew', 'per day', 40000, 'PKR', 'All Video', 'DIT', 0, 1, NULL, NULL, '', 'External', 'mhdfuqxxyrfo3tcrhho');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-MUA-A', 'Hair & Makeup Artist -A', 'Crew', 'per day', 200000, 'PKR', 'All', 'MUA', 0, 0, NULL, NULL, '', 'Nabeela''s Salon', 'mhdfuqy1uszccnawyk');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-MUA-B', 'Hair & Makeup Artist -B', 'Crew', 'per day', 100000, 'PKR', 'All', 'MUA', 0, 0, NULL, NULL, '', 'Nabeela''s Salon', 'mhdfuqy4z5w75suj0o');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('CREW-MUA-C', 'Hair & Makeup Artist -C', 'Crew', 'per day', 40000, 'PKR', 'All', 'MUA', 0, 1, NULL, NULL, '', 'Nabeela''s Salon', 'mhdfuqy9ti9pxs61mnn');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-SCRIPT-A', 'Scriptwriting -A', 'Pre-Production', 'per project', 100000, 'PKR', 'All', 'Scriptwriter', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqyfzapnlli8pso');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-SCRIPT-B', 'Scriptwriting -B', 'Pre-Production', 'per project', 50000, 'PKR', 'All', 'Scriptwriter', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqyji0l9lhm13d8');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-DIT-R', 'Video Editing (Reel)', 'Post-Production', 'per day', 10000, 'PKR', 'All', 'Editor', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqymcad6ur5idpg');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-DIT-D', 'Video Editing (DVC) under 30 sec', 'Post-Production', 'per project', 80000, 'PKR', 'All', 'Editor', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqytc1ggp6375u');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-COLORI', 'Color Grading (Project)', 'Post-Production', 'per project', 50000, 'PKR', 'All', 'Colorist', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqyxupjckbwwvv');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-SOUND-R', 'Sound Design & Mixing (Reel)', 'Post-Production', 'per project', 10000, 'PKR', 'All', 'Sound Designer/Mixer', 0, 1, NULL, NULL, '', 'Internal', 'mhdfuqz1smof0wk6bi');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-SOUND-D', 'Sound Design & Mixing (DVC)', 'Post-Production', 'per project', 150000, 'PKR', 'All', 'Sound Designer/Mixer', 0, 0, NULL, NULL, '', 'external', 'mhdfuqz508jub8m4w0a9');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-MOTION', '2D Motion Graphics', 'Post-Production', 'per project', 100000, 'PKR', 'Explainers, Reels', 'Motion Designer (2D)', 1, 0, NULL, NULL, '', 'Internal', 'mhdfuqzbq2un17sdpwj');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-3DGENE', '3D Motion/CGI', 'Post-Production', 'per project', 150000, 'PKR', 'Explainers, Product', '3D Generalist', 0, 0, NULL, NULL, '', 'Complex shots may require freelancers', 'mhdfuqzesnoxy62qub');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-DIT', 'Subtitles / Captions', 'Post-Production', 'per project', 5000, 'PKR', 'All', 'Editor', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqziwqz2nscpnd');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('DESI-DESIGN', 'Thumbnail / Cover Design', 'Design', 'per asset', 3000, 'PKR', 'YouTube, Reels', 'Designer', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqzlh63djz8rvs');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-RETOUC', 'Photo Editing & Retouch', 'Post-Production', 'per project', 1000, 'PKR', 'Photography', 'Retoucher', 0, 0, NULL, NULL, '', 'Internal', 'mhdfuqzsp5xwnz3tzu');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-SNY-FX3', 'Camera Body – Sony FX3', 'Equipment', 'per day', 15000, 'PKR', 'All Video', '—', 0, 1, NULL, NULL, '', 'One FX3 in-house; >1 requires rental', 'mhdfuqzwh9y4np8l2y9');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-SNY-FX6', 'Camera Body – Sony FX6', 'Equipment', 'per day', 25000, 'PKR', 'All Video', '—', 0, 0, NULL, NULL, '', 'Higher-end body, usually rental', 'mhdfuqzzkjcce01c2r');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-SNY-A7S', 'Camera Body – Sony A7SIII', 'Equipment', 'per day', 8000, 'PKR', 'All Video', '—', 0, 0, NULL, NULL, '', 'External', 'mhdfur04sup0bhoqiq9');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-LENS-GM', 'Lens Kit – Sony G Master', 'Equipment', 'per day', 20000, 'PKR', 'All Video', '—', 0, 0, NULL, NULL, '', 'Prime/zoom set', 'mhdfur09yqxo24g5gxg');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-LGHT-3PL', 'Lighting Kit – 3-Point LED', 'Equipment', 'per day', 22000, 'PKR', 'All Video', '—', 0, 1, NULL, NULL, '', 'Basic set in-house; extras rented', 'mhdfur0dxp0r2nxctfp');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-LGHT-APU', 'Lighting – Aputure Unit', 'Equipment', 'per day', 20000, 'PKR', 'All Video', '—', 0, 0, NULL, NULL, '', 'External', 'mhdfur0g3qcyedeoaee');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-GIMB', 'Gimbal / Stabilizer', 'Equipment', 'per day', 8000, 'PKR', 'All Video', '—', 0, 1, NULL, NULL, '', 'One unit in-house', 'mhdfur0m1t3pcvuxok');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-DOLY', 'Slider / Dolly (Small)', 'Equipment', 'per day', 8000, 'PKR', 'All Video', '—', 0, 0, NULL, NULL, '', 'External', 'mhdfur0qhvvp26prkeo');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-DRONEO-A', 'Drone + Operator -A', 'Equipment', 'per day', 20000, 'PKR', 'Aerial', 'Drone Operator', 0, 0, NULL, NULL, '', 'Permits/weather dependent', 'mhdfur0thrg2wowzeg6');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-DRONEO-B', 'Drone + Operator -B', 'Equipment', 'per day', 20000, 'PKR', 'Aerial', 'Drone Operator', 0, 0, NULL, NULL, '', 'Permits/weather dependent', 'mhdfur0x7h6oim4hy2o');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-RNT-S', 'Studio Rental – Small', 'Equipment', 'per day', 30000, 'PKR', 'DVC, Interviews', '—', 0, 0, NULL, NULL, '', 'External', 'mhdfur1299mk2vakr9n');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-SCR-ST', 'Green Screen Setup / Studio', 'Equipment', 'per day', 100000, 'PKR', 'VFX/Keying', '—', 0, 1, NULL, NULL, '', 'External', 'mhdfur16anmt7tu520a');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('EQUIP-LIV-KIT', 'Live Streaming Kit (Switcher + Enc)', 'Equipment', 'per day', 120000, 'PKR', 'Live', '—', 0, 0, NULL, NULL, '', 'External', 'mhdfur1aj1pzulg4tpq');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-CAT-CW', 'Catering for Crew', 'Production', 'per person', 800, 'PKR', 'All Production', '—', 0, 0, NULL, NULL, '', 'Per person per day rates', 'mhdfur1euqthhhyry7');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isOptional, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-CAT-AT', 'Catering for Artist', 'Production', 'per person', 10000, 'PKR', 'All Production', '—', 0, 0, NULL, NULL, '', 'Per person per day rates', 'mhdfur1jfg63076ltb');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-STORY-A', 'Storyboarding', 'Pre-Production', 'per project', 50000, 'PKR', 'All Video', '', 1, NULL, NULL, '', 'Internal', 'mhepgqcjib4kuzsyfi');
INSERT INTO services (serviceCode, name, category, unit, baseRate, currency, contentTypes, teamRoles, isNegotiable, minQty, maxQty, includes, notes, id) VALUES ('PROD-MOOD-A', 'Moodboarding', 'Pre-Production', 'per project', 50000, 'PKR', 'All Video', '', 1, NULL, NULL, '', 'Internal', 'mhepgqcxn37ks8ld7oc');

-- Table: bundles
DELETE FROM bundles;
INSERT INTO bundles (bundleCode, name, parentServiceId, description, unit, id) VALUES ('BNDL-REEL-EDIT', 'Instagram Reel – Edit Only', NULL, '', 'per day', '15');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-REEL-SHOOTEDIT', 'Instagram Reel – Shoot + Edit', NULL, '', '16');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-INTVW-1CAM', 'Corporate Interview – 1 Cam', NULL, '', '17');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-INTVW-2CAM', 'Corporate Interview – 2 Cam', NULL, '', '18');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-PROD-TABLETOP', 'Product Tabletop – Photo + Video', NULL, '', '19');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-EVENT-1DAY-PVH', 'Event Coverage – 1 Day (Photo+Video+Highlight)', NULL, '', '20');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-GREENSCREEN', 'Studio Green Screen – Shoot + Key', NULL, '', '21');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-ANIM-2D', '2D Explainer – Script to Screen', NULL, '', '22');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-ANIM-3D', '3D Product Animation – Short', NULL, '', '23');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-LIVE-1CAM', 'Live Streaming – 1 Cam', NULL, '', '24');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, unit, id) VALUES ('BNDL-DVC-IND-1D', 'DVC Indoor Shoot – 1 Day', NULL, '', 'per day', '25');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-REALEST-1D', 'Real Estate Walkthrough – 1 Day', NULL, '', '26');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-PODCAST-2CAM', 'Podcast Video – 2 Cam', NULL, '', '27');
INSERT INTO bundles (bundleCode, name, parentServiceId, description, id) VALUES ('BNDL-TRAINING-VID', 'Corporate Training Video', NULL, '', '28');

-- Table: bundle_items
DELETE FROM bundle_items;
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '136');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfuqx6hbqe9k61685', 1, 0, 1, 1, '', '137');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfuqxgnfhpcqmw5um', 1, 0, 1, 1, '', '138');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfuqzwh9y4np8l2y9', 1, 0, 1, 1, '', '139');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfur09yqxo24g5gxg', 1, 0, 1, 1, '', '140');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfur0dxp0r2nxctfp', 1, 0, 1, 1, '', '141');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfur0m1t3pcvuxok', 1, 0, 1, 1, '', '142');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '143');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfuqyxupjckbwwvv', 1, 0, 1, 1, '', '144');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('16', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '145');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('17', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '146');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('17', 'mhdfuqxopr0qxrtzjf', 1, 0, 1, 1, '', '147');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('17', 'mhdfuqzwh9y4np8l2y9', 1, 0, 1, 1, '', '148');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('17', 'mhdfur0dxp0r2nxctfp', 1, 0, 1, 1, '', '149');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('18', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '160');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('19', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '161');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('19', 'mhdfuqzwh9y4np8l2y9', 1, 0, 1, 1, '', '162');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('19', 'mhdfur0g3qcyedeoaee', 1, 1, 0, 0, '', '163');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('19', 'mhdfur1299mk2vakr9n', 1, 1, 0, 0, '', '164');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('19', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '165');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('19', 'mhdfuqzsp5xwnz3tzu', 1, 0, 1, 1, '', '166');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('20', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '167');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('20', 'mhdfuqxopr0qxrtzjf', 1, 0, 1, 1, '', '168');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('20', 'mhdfuqzwh9y4np8l2y9', 1, 0, 1, 1, '', '169');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('20', 'mhdfur09yqxo24g5gxg', 1, 0, 1, 1, '', '170');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('20', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '171');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('20', 'mhdfuqyxupjckbwwvv', 1, 0, 1, 1, '', '172');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('20', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '173');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('21', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '174');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('21', 'mhdfuqxgnfhpcqmw5um', 1, 0, 1, 1, '', '175');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('21', 'mhdfur16anmt7tu520a', 1, 0, 1, 1, '', '176');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('21', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '177');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('21', 'mhdfuqzbq2un17sdpwj', 1, 0, 1, 1, '', '178');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('21', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '179');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('22', 'mhdfuqyfzapnlli8pso', 1, 0, 1, 1, '', '180');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('22', 'mhepgqcjib4kuzsyfi', 1, 0, 1, 1, '', '181');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('22', 'mhdfuqzbq2un17sdpwj', 1, 0, 1, 1, '', '182');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('22', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '183');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('23', 'mhdfuqyfzapnlli8pso', 1, 1, 0, 0, '', '184');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('23', 'mhdfuqzesnoxy62qub', 1, 0, 1, 1, '', '185');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('23', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '186');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('24', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '187');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('24', 'mhdfur1aj1pzulg4tpq', 1, 0, 1, 1, '', '188');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('24', 'mhdfuqxopr0qxrtzjf', 1, 0, 1, 1, '', '189');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '203');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfuqx6hbqe9k61685', 1, 0, 1, 1, '', '204');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfuqzwh9y4np8l2y9', 1, 0, 1, 1, '', '205');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfur09yqxo24g5gxg', 1, 0, 1, 1, '', '206');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfur0m1t3pcvuxok', 1, 0, 1, 1, '', '207');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfur0qhvvp26prkeo', 1, 1, 0, 0, '', '208');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '209');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfuqyxupjckbwwvv', 1, 0, 1, 1, '', '210');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '211');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('26', 'mhdfuqzlh63djz8rvs', 1, 1, 0, 0, '', '212');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '213');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfuqx6hbqe9k61685', 1, 0, 1, 1, '', '214');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfuqzwh9y4np8l2y9', 2, 0, 1, 1, '', '216');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfur1aj1pzulg4tpq', 1, 1, 0, 0, '', '217');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '218');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfuqyxupjckbwwvv', 1, 0, 1, 1, '', '219');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '220');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('27', 'mhdfuqziwqz2nscpnd', 1, 1, 0, 0, '', '221');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqyfzapnlli8pso', 1, 0, 1, 1, '', '222');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqx2toqeuxuk9fa', 1, 0, 1, 1, '', '223');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqx6hbqe9k61685', 1, 0, 1, 1, '', '224');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqzwh9y4np8l2y9', 1, 0, 1, 1, '', '226');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '227');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqyxupjckbwwvv', 1, 0, 1, 1, '', '228');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '229');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('28', 'mhdfuqziwqz2nscpnd', 1, 1, 0, 0, '', '230');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqx2toqeuxuk9fa', 1, 1, 1, 1, '', '231');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqx6hbqe9k61685', 1, 1, 0, 0, '', '232');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqww11srqkeh1nsk', 1, 1, 0, 0, '', '233');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqx94lxw9nx5082', 1, 0, 1, 1, '', '234');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqxopr0qxrtzjf', 1, 0, 1, 1, '', '235');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqy4z5w75suj0o', 1, 1, 0, 0, '', '236');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqzzkjcce01c2r', 1, 0, 1, 1, '', '237');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfur09yqxo24g5gxg', 1, 0, 1, 1, '', '238');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfur0g3qcyedeoaee', 1, 0, 1, 1, '', '239');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfur1299mk2vakr9n', 1, 1, 0, 0, '', '240');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqytc1ggp6375u', 1, 0, 1, 1, '', '241');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqyxupjckbwwvv', 1, 0, 1, 1, '', '242');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqz508jub8m4w0a9', 1, 0, 1, 1, '', '243');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('25', 'mhdfuqxgnfhpcqmw5um', 1, 0, 1, 1, '', '244');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('15', 'mhdfuqymcad6ur5idpg', 1, 0, 1, 1, '', '245');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('15', 'mhdfuqyxupjckbwwvv', 1, 0, 1, 1, '', '246');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('15', 'mhdfuqz1smof0wk6bi', 1, 0, 1, 1, '', '247');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('15', 'mhdfuqzbq2un17sdpwj', 1, 1, 0, 0, '', '248');
INSERT INTO bundle_items (bundleId, childServiceId, childQty, isOptional, defaultSelected, include, notes, id) VALUES ('15', 'mhdfuqziwqz2nscpnd', 1, 1, 0, 0, '', '249');

-- Table: company_templates
DELETE FROM company_templates;
INSERT INTO company_templates (name, companyName, companyPhone, companyEmail, companyLogo, companyAddress, defaultCurrency, taxRate, headerBuffer, discountType, discountValue, quotationTerms, invoiceTerms, quotationNotes, invoiceNotes, isDefault, isActive, id) VALUES ('Digital Next', 'Digital Next', '021 34166154', 'info@digitalnext.co', '/assets/dn-logo.png', 'C-155 Block 2, Kehkashan,
Clifton, 75600, Karachi', 'PKR', 0.15, 0.5, 'None', 0, '1. This quotation is valid for 30 days from the date of issue.
2. All rates are exclusive of applicable taxes unless stated otherwise.
3. 50% advance payment required to commence work.
4. Final payment due within 15 days of project completion.
5. Additional revisions beyond scope will be charged separately.
6. Travel and accommodation costs (if required) will be charged extra.
7. Client to provide necessary permissions and clearances for shooting.', '1. Payment due within 15 days of invoice date.
2. All payments to be made by cheque in the name of the company or credited online to the following bank account: 
Bank Name: Habib Metropolitan Bank Ltd 
Title: DIGITAL NEXT 
Account No. 60119203017140144258 
IBAN: PK34MPBL0119067140144258
Branch Name: Saba Avenue Phase – V Ext. Karachi', 'Thank you for considering our services. We look forward to working with you on this project.', 'Thank you for your business. Please remit payment as per the terms mentioned above.', 1, 1, '2651f4ce-1c6f-438f-92c5-28c147f1e8c7');
INSERT INTO company_templates (name, companyName, companyPhone, companyEmail, companyLogo, companyAddress, defaultCurrency, taxRate, headerBuffer, discountType, discountValue, quotationTerms, invoiceTerms, quotationNotes, invoiceNotes, isDefault, isActive, id) VALUES ('Bodybeat', 'Bodybeat', '021 34166154', 'info@bodybeatgroup.com', '', 'C-155 Block 2, Kehkashan,
Clifton, Karachi - 75600', 'PKR', 0.15, 0.5, 'None', 0, '1. This quotation is valid for 30 days from the date of issue.
2. All rates are exclusive of applicable taxes unless stated otherwise.
3. 50% advance payment required to commence work.
4. Final payment due within 15 days of project completion.
5. Additional revisions beyond scope will be charged separately.
6. Travel and accommodation costs (if required) will be charged extra.
7. Client to provide necessary permissions and clearances for shooting.', '1. Payment due within 15 days of invoice date.
2. All payments to be made by cheque in the name of the company or credited online to the following bank account: 
Bank Name: Habib Metropolitan Bank Ltd 
Title: BODYBEAT 
Account No. 60119203017140137948
IBAN: PK72MPBL0119067140137948
Branch Name: Saba Avenue Phase – V Ext. Karachi', 'Thank you for considering our services. We look forward to working with you on this project.', 'Thank you for your business. Please remit payment as per the terms mentioned above.', 0, 1, 'a942df47-423f-4a81-ac5a-e42f96744740');
INSERT INTO company_templates (name, companyName, companyPhone, companyEmail, companyLogo, companyAddress, defaultCurrency, taxRate, headerBuffer, discountType, discountValue, quotationTerms, invoiceTerms, quotationNotes, invoiceNotes, isDefault, isActive, id) VALUES ('Default Template', 'Production Services', '+92-300-1234567', 'info@productionservices.com', '', '123 Business District, Karachi, Pakistan', 'PKR', 0.09, 0.15, 'None', 0, 'Terms and Conditions:
1. This quotation is valid for 30 days from the date of issue
2. Payment terms are Net 30 days from invoice date
3. All prices are exclusive of taxes unless stated otherwise
4. Changes to scope may affect pricing and delivery timeline', 'Payment Terms:
1. Payment is due within 30 days of invoice date
2. Late payment charges of 2% per month may apply
3. All disputes must be raised within 7 days of invoice date
4. Payment should be made to the account details provided', 'Thank you for considering our services. We look forward to working with you.', 'Thank you for your business. Please remit payment by the due date to avoid late charges.', 0, 1, '435691e8-b86a-4d5e-90f5-1ba20b21cc9c');

-- Table: currency_rates
DELETE FROM currency_rates;
INSERT INTO currency_rates (id, fromCur, toCur, rate, notes, created_at, updated_at) VALUES ('aed-pkr', 'AED', 'PKR', 76, 'AED to PKR exchange rate', 1760559617793, 1760559617793);
INSERT INTO currency_rates (id, fromCur, toCur, rate, notes, created_at, updated_at) VALUES ('usd-pkr', 'USD', 'PKR', 280, 'USD to PKR exchange rate', 1760559617793, 1760559617793);
