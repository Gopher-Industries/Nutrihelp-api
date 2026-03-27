const serviceContentRepository = require('../repositories/serviceContentRepository');

async function createServiceModel({ title, description, image, online }) {
  return serviceContentRepository.createServiceContent({
    title,
    description,
    image,
    online,
  });
}

async function updateServiceModel(id, fields) {
  const updateData = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  return serviceContentRepository.updateServiceContent(id, updateData);
}

async function deleteServiceModel(id) {
  return serviceContentRepository.deleteServiceContent(id);
}

async function addSubscribeModel({ email }) {
  return serviceContentRepository.createSubscription({ email });
}

module.exports = { createServiceModel, updateServiceModel,deleteServiceModel, addSubscribeModel };
