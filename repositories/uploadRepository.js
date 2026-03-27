const { createClient } = require('@supabase/supabase-js');
const { wrapRepositoryError } = require('./repositoryError');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function uploadFileToStorage({ bucket, filePath, buffer, contentType, cacheControl = '3600' }) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        cacheControl
      });

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to upload file to storage', error, { bucket, filePath });
  }
}

async function getPublicUrl(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (error) throw error;
    return data?.publicUrl || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to generate public file URL', error, { bucket, filePath });
  }
}

async function createUploadLog({ userId, fileName, fileUrl, uploadTime }) {
  try {
    const { data, error } = await supabase
      .from('upload_logs')
      .insert([{
        user_id: userId,
        file_name: fileName,
        file_url: fileUrl,
        upload_time: uploadTime
      }])
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create upload log', error, { userId, fileName });
  }
}

module.exports = {
  createUploadLog,
  getPublicUrl,
  uploadFileToStorage
};
