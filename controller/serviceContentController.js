const supabase = require('../dbConnection');

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

module.exports = { getServiceContents };
