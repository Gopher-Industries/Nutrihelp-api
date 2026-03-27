const supabase = require('../dbConnection');
const { decode } = require('base64-arraybuffer');
const { wrapRepositoryError } = require('./repositoryError');

async function uploadImageToBucket(path, image, upsert = false) {
  try {
    await supabase.storage.from('images').upload(path, decode(image), {
      cacheControl: '3600',
      upsert
    });
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to upload image to storage', error, { path });
  }
}

async function createImageRecord({ fileName, displayName, fileSize }) {
  try {
    const { data, error } = await supabase
      .from('images')
      .insert({
        file_name: fileName,
        display_name: displayName,
        file_size: fileSize
      })
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create image record', error, { fileName });
  }
}

async function getImageById(imageId) {
  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load image record', error, { imageId });
  }
}

module.exports = {
  createImageRecord,
  getImageById,
  uploadImageToBucket
};
