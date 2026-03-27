const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function getServiceContents() {
  try {
    const { data, error } = await supabase
      .from('nutrihelp_services')
      .select('title, description, image');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load service contents', error);
  }
}

async function getServiceContentsPage({ page, pageSize, search, onlineOnly }) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('nutrihelp_services')
      .select('id, title, description, image, online, created_at, updated_at', {
        count: 'exact'
      })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (onlineOnly) {
      query = query.eq('online', true);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    throw wrapRepositoryError('Failed to load paged service contents', error);
  }
}

async function createServiceContent({ title, description, image, online }) {
  try {
    const { data, error } = await supabase
      .from('nutrihelp_services')
      .insert({ title, description, image, online })
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create service content', error);
  }
}

async function updateServiceContent(id, fields) {
  try {
    const { data, error } = await supabase
      .from('nutrihelp_services')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to update service content', error, { id });
  }
}

async function deleteServiceContent(id) {
  try {
    const { error } = await supabase
      .from('nutrihelp_services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete service content', error, { id });
  }
}

async function createSubscription({ email }) {
  try {
    const { data, error } = await supabase
      .from('newsletter')
      .insert({ email })
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create subscription', error, { email });
  }
}

module.exports = {
  createServiceContent,
  createSubscription,
  getServiceContents,
  getServiceContentsPage,
  updateServiceContent,
  deleteServiceContent
};
