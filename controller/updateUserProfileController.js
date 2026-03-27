const userRepository = require('../repositories/userRepository');

exports.updateUserProfile = async (req, res) => {
    try {
        const { identifier, updates } = req.body;

        if (!identifier) {
            return res.status(400).json({ message: "Email or Username is required as identifier." });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ message: "Updates object is required." });
        }

        const userData = await userRepository.findByIdentifier(identifier);
        if (!userData) {
            return res.status(404).json({ message: "User not found with provided identifier." });
        }

   
        const updatedData = await userRepository.updateByUserId(userData.user_id, updates);

        return res.status(200).json({
            message: "User profile updated successfully.",
            updatedProfile: updatedData
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};
