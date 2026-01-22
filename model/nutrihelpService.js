const supabase = require("../dbConnection.js");

async function createServiceModel({ title, description, image, online }) {
  const { data, error } = await supabase
    .from("nutrihelp_services")
    .insert({
      title,
      description,
      image,
      online,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateServiceModel(id, fields) {
  const updateData = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("nutrihelp_services")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteServiceModel(id) {
  const { error } = await supabase
    .from("nutrihelp_services")
    .delete()
    .eq("id", id);

  if (error) throw error;
}


module.exports = { createServiceModel, updateServiceModel,deleteServiceModel };
