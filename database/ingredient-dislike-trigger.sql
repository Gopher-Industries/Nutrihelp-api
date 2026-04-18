-- Update dislike BOOL for recipes relation
create function update_dislikes()
returns trigger
language plpgsql
as $$
begin
    UPDATE recipe_ingredient t1
    SET dislike = TRUE
    FROM user_dislikes t2
    WHERE t1.user_id = t2.user_id AND t1.ingredient_id = t2.dislike_id;
    RETURN NULL;
end;
$$;

create trigger dislike_update_trigger
after insert on recipe_ingredient
for each row
execute function update_dislikes();