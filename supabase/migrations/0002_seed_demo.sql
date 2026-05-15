-- Seed the 10 Phase 1 demo listings into Supabase.
-- Run AFTER 0001_listings.sql. Idempotent (upsert on primary key).
-- These mirror src/data/listings.js so the site behaves identically once
-- it reads from the database.

insert into public.listings
  (id, source, source_id, title, prefecture, city, price, is_free,
   condition, locality, size_m2, land_m2, year_built, bedrooms, lat, lng,
   image, description)
values
  ('aky-001','demo','aky-001','Mountain-view minka with timber beams','Nagano','Iiyama',0,true,'needs-work','rural',142,530,1968,4,36.8514,138.366,'https://picsum.photos/seed/aky001/800/520','Traditional kominka offered free through the Iiyama akiya bank. Solid post-and-beam structure, deep snow-country roof, large engawa veranda. Needs roof and plumbing work. Buyer pays only transfer registration.'),
  ('aky-002','demo','aky-002','Renovated machiya near Kochi castle','Kochi','Kochi',8900000,false,'move-in','urban',96,110,1979,3,33.5597,133.5311,'https://picsum.photos/seed/aky002/800/520','Fully renovated townhouse, walking distance to Kochi Castle and the Sunday market. New kitchen, retiled bath, insulated. Move-in ready, ideal for a remote-work base.'),
  ('aky-003','demo','aky-003','Coastal farmhouse with citrus grove','Ehime','Yawatahama',2300000,false,'needs-work','rural',118,940,1972,3,33.4626,132.4231,'https://picsum.photos/seed/aky003/800/520','Hillside farmhouse overlooking the Uwa Sea with a producing mikan citrus grove on the land. Habitable but dated interior. Strong potential for a small agritourism stay.'),
  ('aky-004','demo','aky-004','Free snow-country house, large workshop','Niigata','Tokamachi',0,true,'needs-work','rural',165,680,1965,5,37.1278,138.7558,'https://picsum.photos/seed/aky004/800/520','Offered free via the Tokamachi akiya bank. Detached workshop building plus main house. Heavy snow region — reinforced structure. Requires interior modernisation.'),
  ('aky-005','demo','aky-005','Tear-down lot, river frontage','Gifu','Gujo',1200000,false,'tear-down','rural',88,410,1958,3,35.7486,136.9636,'https://picsum.photos/seed/aky005/800/520','Priced for land value. Existing structure is beyond economical repair — best demolished and rebuilt. Quiet riverside parcel in the historic water town of Gujo Hachiman.'),
  ('aky-006','demo','aky-006','Hokkaido cabin near ski fields','Hokkaido','Kutchan',14500000,false,'move-in','typical',104,600,1995,3,42.9018,140.7593,'https://picsum.photos/seed/aky006/800/520','Insulated four-season cabin near the Niseko/Kutchan ski area. Wood stove, double glazing, snow-load roof. Move-in ready with strong winter rental demand.'),
  ('aky-007','demo','aky-007','Onsen-town house, walk to baths','Oita','Beppu',4700000,false,'needs-work','urban',92,95,1981,3,33.2846,131.4914,'https://picsum.photos/seed/aky007/800/520','Compact house in Beppu, minutes on foot from public onsen. Cosmetic renovation needed. City-centre location with year-round tourism footfall.'),
  ('aky-008','demo','aky-008','Free village house with rice paddy','Tokushima','Miyoshi',0,true,'needs-work','rural',130,1250,1963,4,34.0211,133.8056,'https://picsum.photos/seed/aky008/800/520','Iya Valley region akiya offered free, includes an adjoining rice paddy and vegetable plot. Remote and scenic. Buyer commits to residency or restoration per the local bank terms.'),
  ('aky-009','demo','aky-009','Seaside cottage, Kagoshima bay','Kagoshima','Tarumizu',3600000,false,'move-in','typical',86,320,1988,2,31.4911,130.7036,'https://picsum.photos/seed/aky009/800/520','Tidy two-bedroom cottage with Sakurajima volcano views across the bay. Recently re-roofed, ready to occupy. Mild climate, low cost of living.'),
  ('aky-010','demo','aky-010','Forest retreat with cedar grounds','Wakayama','Tanabe',5900000,false,'needs-work','rural',124,1010,1976,3,33.7297,135.3781,'https://picsum.photos/seed/aky010/800/520','Secluded house on cedar-wooded grounds near the Kumano Kodo pilgrimage route. Structurally sound, interior needs updating. Excellent for a guesthouse or writer/artist retreat.')
on conflict (id) do update set
  title       = excluded.title,
  price       = excluded.price,
  is_free     = excluded.is_free,
  condition   = excluded.condition,
  locality    = excluded.locality,
  description = excluded.description,
  active      = true;
