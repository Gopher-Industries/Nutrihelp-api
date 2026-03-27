const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function upsertWaterIntake({ userId, date, glassesConsumed, updatedAt }) {
  try {
    const { data, error } = await supabase
      .from('water_intake')
      .upsert({
        user_id: userId,
        date,
        glasses_consumed: glassesConsumed,
        updated_at: updatedAt
      }, { onConflict: ['user_id', 'date'] })
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to upsert water intake', error, { userId, date });
  }
}

module.exports = {
  upsertWaterIntake
};
