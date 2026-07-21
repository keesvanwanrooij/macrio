-- Macrio v1.0 — seed: generic foods (per 100 g) so search is useful on day one.
-- Values are typical averages; the community refines them via versions.
-- allergens: only confident claims; everything absent = unknown.

do $$
declare
  item jsonb;
  items jsonb := $json$[
  {"nl":"Appel","en":"Apple","kcal":52,"c":12,"p":0.3,"f":0.2,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 appel","grams":180}]},
  {"nl":"Banaan","en":"Banana","kcal":89,"c":20,"p":1.1,"f":0.3,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 banaan","grams":120}]},
  {"nl":"Sinaasappel","en":"Orange","kcal":47,"c":9,"p":0.9,"f":0.1,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 sinaasappel","grams":150}]},
  {"nl":"Aardbeien","en":"Strawberries","kcal":32,"c":6,"p":0.7,"f":0.3,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 schaaltje","grams":150}]},
  {"nl":"Blauwe bessen","en":"Blueberries","kcal":57,"c":12,"p":0.7,"f":0.3,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 handje","grams":50}]},
  {"nl":"Druiven","en":"Grapes","kcal":69,"c":16,"p":0.7,"f":0.2,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 handje","grams":80}]},
  {"nl":"Tomaat","en":"Tomato","kcal":18,"c":2.7,"p":0.9,"f":0.2,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 tomaat","grams":100}]},
  {"nl":"Komkommer","en":"Cucumber","kcal":15,"c":2.5,"p":0.7,"f":0.1,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1/4 komkommer","grams":100}]},
  {"nl":"Paprika","en":"Bell pepper","kcal":31,"c":6,"p":1,"f":0.3,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 paprika","grams":150}]},
  {"nl":"Broccoli (gekookt)","en":"Broccoli (boiled)","kcal":35,"c":4,"p":2.4,"f":0.4,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 portie","grams":200}]},
  {"nl":"Gemengde groente (gekookt)","en":"Mixed vegetables (boiled)","kcal":40,"c":6,"p":2.5,"f":0.5,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 portie","grams":200}]},
  {"nl":"Sla (gemengd)","en":"Salad (mixed greens)","kcal":17,"c":2,"p":1.3,"f":0.3,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 kom","grams":75}]},
  {"nl":"Aardappel (gekookt)","en":"Potato (boiled)","kcal":87,"c":19,"p":1.9,"f":0.1,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 aardappel","grams":135}]},
  {"nl":"Friet","en":"French fries","kcal":312,"c":41,"p":3.4,"f":15,"al":{},"po":[{"name":"1 portie","grams":150}]},
  {"nl":"Witte rijst (gekookt)","en":"White rice (cooked)","kcal":130,"c":28,"p":2.7,"f":0.3,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 portie","grams":180}]},
  {"nl":"Zilvervliesrijst (gekookt)","en":"Brown rice (cooked)","kcal":112,"c":23,"p":2.6,"f":0.9,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 portie","grams":180}]},
  {"nl":"Pasta (gekookt)","en":"Pasta (cooked)","kcal":131,"c":25,"p":5,"f":1.1,"al":{"gluten":"contains"},"po":[{"name":"1 portie","grams":200}]},
  {"nl":"Glutenvrije pasta (gekookt)","en":"Gluten-free pasta (cooked)","kcal":140,"c":29,"p":3,"f":0.9,"al":{"gluten":"free"},"po":[{"name":"1 portie","grams":200}]},
  {"nl":"Couscous (gekookt)","en":"Couscous (cooked)","kcal":112,"c":23,"p":3.8,"f":0.2,"al":{"gluten":"contains"},"po":[{"name":"1 portie","grams":150}]},
  {"nl":"Quinoa (gekookt)","en":"Quinoa (cooked)","kcal":120,"c":21,"p":4.4,"f":1.9,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 portie","grams":150}]},
  {"nl":"Volkorenbrood","en":"Whole wheat bread","kcal":247,"c":41,"p":13,"f":3.4,"al":{"gluten":"contains"},"po":[{"name":"1 snee","grams":35}]},
  {"nl":"Wit brood","en":"White bread","kcal":265,"c":49,"p":9,"f":3.2,"al":{"gluten":"contains"},"po":[{"name":"1 snee","grams":30}]},
  {"nl":"Glutenvrij brood","en":"Gluten-free bread","kcal":246,"c":44,"p":4,"f":5,"al":{"gluten":"free"},"po":[{"name":"1 snee","grams":30}]},
  {"nl":"Havermout","en":"Oats","kcal":379,"c":59,"p":13,"f":6.5,"al":{},"po":[{"name":"1 portie","grams":50}]},
  {"nl":"Glutenvrije havermout","en":"Gluten-free oats","kcal":379,"c":59,"p":13,"f":6.5,"al":{"gluten":"free"},"po":[{"name":"1 portie","grams":50}]},
  {"nl":"Rijstwafel","en":"Rice cake","kcal":387,"c":81,"p":8,"f":2.8,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 wafel","grams":8}]},
  {"nl":"Cracker","en":"Cracker","kcal":420,"c":68,"p":10,"f":11,"al":{"gluten":"contains"},"po":[{"name":"1 cracker","grams":8}]},
  {"nl":"Halfvolle melk","en":"Semi-skimmed milk","kcal":46,"c":4.7,"p":3.4,"f":1.5,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 glas","grams":250}]},
  {"nl":"Volle melk","en":"Whole milk","kcal":64,"c":4.6,"p":3.3,"f":3.5,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 glas","grams":250}]},
  {"nl":"Havermelk","en":"Oat milk","kcal":45,"c":6.6,"p":1,"f":1.5,"al":{"milk":"free"},"po":[{"name":"1 glas","grams":250}]},
  {"nl":"Magere yoghurt","en":"Low-fat yogurt","kcal":57,"c":6,"p":4.3,"f":1.5,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 schaaltje","grams":150}]},
  {"nl":"Griekse yoghurt","en":"Greek yogurt","kcal":121,"c":4,"p":4.6,"f":10,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 schaaltje","grams":150}]},
  {"nl":"Magere kwark","en":"Low-fat quark","kcal":63,"c":4,"p":10,"f":0.3,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 schaaltje","grams":200}]},
  {"nl":"Goudse kaas 48+","en":"Gouda cheese","kcal":356,"c":0,"p":24,"f":29,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 plak","grams":20}]},
  {"nl":"30+ kaas","en":"Reduced-fat cheese","kcal":280,"c":0,"p":29,"f":18,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 plak","grams":20}]},
  {"nl":"Ei (gekookt)","en":"Egg (boiled)","kcal":155,"c":1.1,"p":13,"f":11,"al":{"gluten":"free","milk":"free","eggs":"contains"},"po":[{"name":"1 ei","grams":58}]},
  {"nl":"Kipfilet (bereid)","en":"Chicken breast (cooked)","kcal":165,"c":0,"p":31,"f":3.6,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 filet","grams":150}]},
  {"nl":"Rundergehakt (bereid)","en":"Ground beef (cooked)","kcal":250,"c":0,"p":26,"f":16,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 portie","grams":100}]},
  {"nl":"Zalm (bereid)","en":"Salmon (cooked)","kcal":208,"c":0,"p":20,"f":13,"al":{"gluten":"free","milk":"free","fish":"contains"},"po":[{"name":"1 moot","grams":125}]},
  {"nl":"Witvis (bereid)","en":"White fish (cooked)","kcal":105,"c":0,"p":23,"f":1,"al":{"gluten":"free","milk":"free","fish":"contains"},"po":[{"name":"1 filet","grams":120}]},
  {"nl":"Tofu","en":"Tofu","kcal":76,"c":1.9,"p":8,"f":4.8,"al":{"gluten":"free","milk":"free","soybeans":"contains"},"po":[{"name":"1 portie","grams":100}]},
  {"nl":"Hamburger","en":"Hamburger patty","kcal":230,"c":19,"p":17,"f":21,"al":{},"po":[{"name":"1 burger","grams":150}]},
  {"nl":"Pindakaas","en":"Peanut butter","kcal":588,"c":20,"p":25,"f":50,"al":{"gluten":"free","milk":"free","peanuts":"contains"},"po":[{"name":"1 el","grams":15}]},
  {"nl":"Gemengde noten","en":"Mixed nuts","kcal":607,"c":13,"p":20,"f":54,"al":{"gluten":"free","milk":"free","nuts":"contains"},"po":[{"name":"1 handje","grams":25}]},
  {"nl":"Hummus","en":"Hummus","kcal":177,"c":10,"p":7,"f":12,"al":{"gluten":"free","milk":"free","sesame":"contains"},"po":[{"name":"1 el","grams":25}]},
  {"nl":"Olijfolie","en":"Olive oil","kcal":884,"c":0,"p":0,"f":100,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 el","grams":10}]},
  {"nl":"Roomboter","en":"Butter","kcal":717,"c":0.1,"p":0.9,"f":81,"al":{"gluten":"free","milk":"contains"},"po":[{"name":"1 el","grams":10}]},
  {"nl":"Pure chocolade","en":"Dark chocolate","kcal":546,"c":45,"p":5,"f":38,"al":{"milk":"unknown"},"po":[{"name":"1 blokje","grams":10}]},
  {"nl":"Melkchocolade","en":"Milk chocolate","kcal":535,"c":59,"p":7.7,"f":30,"al":{"milk":"contains"},"po":[{"name":"1 blokje","grams":10}]},
  {"nl":"Chips (naturel)","en":"Potato chips","kcal":536,"c":50,"p":6.6,"f":34,"al":{},"po":[{"name":"1 handje","grams":25}]},
  {"nl":"Cola","en":"Cola","kcal":42,"c":10.6,"p":0,"f":0,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 glas","grams":250},{"name":"1 blikje","grams":330}]},
  {"nl":"Sinaasappelsap","en":"Orange juice","kcal":45,"c":10,"p":0.7,"f":0.2,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 glas","grams":250}]},
  {"nl":"Bier","en":"Beer","kcal":43,"c":3.6,"p":0.5,"f":0,"al":{"gluten":"contains"},"po":[{"name":"1 glas","grams":250},{"name":"1 flesje","grams":300}]},
  {"nl":"Rode wijn","en":"Red wine","kcal":85,"c":2.6,"p":0.1,"f":0,"al":{"gluten":"free","milk":"free"},"po":[{"name":"1 glas","grams":125}]}
  ]$json$::jsonb;
  v_product_id uuid;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    insert into public.products (source, is_generic)
    values ('seed', true)
    returning id into v_product_id;

    insert into public.product_versions
      (product_id, version_number, name_nl, name_en,
       kcal_100g, carbs_100g, protein_100g, fat_100g, allergens, portions)
    values
      (v_product_id, 1, item->>'nl', item->>'en',
       (item->>'kcal')::numeric, (item->>'c')::numeric,
       (item->>'p')::numeric, (item->>'f')::numeric,
       coalesce(item->'al', '{}'::jsonb), coalesce(item->'po', '[]'::jsonb));
  end loop;
end;
$$;
