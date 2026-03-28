-- Update ingredient allergy BOOL for recipes relation
create function update_allergies()
returns trigger
language plpgsql
as $$
begin
    UPDATE recipe_ingredient t1
    SET allergy = TRUE
    FROM user_allergies t2
    WHERE t1.user_id = t2.user_id AND t1.ingredient_id = t2.allergy_id;
    RETURN NULL;
end;
$$;

create trigger allergy_update_trigger
after insert on recipe_ingredient
for each row
execute function update_allergies();