const supabase = require('../dbConnection');
const {createServiceModel, updateServiceModel, deleteServiceModel} = require('../model/nutrihelpService.js');
/**
 * Get Nutrihelp Services
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getServiceContents = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('nutrihelp_services')
            .select('title, description, image');

        if (error) {
            console.error('Error get service contents:', error.message);
            return res.status(500).json({ error: 'Failed to get service contents' });
        }

        return res.status(200).json({ message: 'Get service contents successfully', data });
    } catch (error) {
        console.error('Internal server error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getServiceContentsPage = async (req, res) => {
  try {
    // Query params for pagination and search
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const search = req.query.search || '';
    const onlineOnly = req.query.online === 'true';

    // Build Supabase query
    let query = supabase
      .from('nutrihelp_services')
      .select('id, title, description, image, online, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Filter by online if requested
    if (onlineOnly) {
      query = query.eq('online', true);
    }

    // Search by title or description
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error getting service contents:', error.message);
      return res.status(500).json({ error: 'Failed to get service contents' });
    }

    return res.status(200).json({
      message: 'Service contents fetched successfully',
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
      data
    });
  } catch (error) {
    console.error('Internal server error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const createService = async (req, res) => {
  try {
    const { title, description, image, online = false } = req.body;

    if (!title || !description || !image) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const service = await createServiceModel({
      title,
      description,
      image,
      online
    });

    res.status(201).json({
      message: "Service created successfully",
      data: service
    });
  } catch (error) {
    console.error("Error creating service:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image, online } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const service = await updateServiceModel(id, {
      title,
      description,
      image,
      online
    });

    res.status(200).json({
      message: "Service updated successfully",
      data: service
    });
  } catch (error) {
    console.error("Error updating service:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    await deleteServiceModel(id);

    res.status(200).json({
      message: "Service deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting service:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getServiceContents, getServiceContentsPage , createService, updateService,deleteService};
