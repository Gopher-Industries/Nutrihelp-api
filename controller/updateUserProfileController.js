const supabase = require('../dbConnection.js');

exports.updateUserProfile = async (req, res) => {
    console.log(" hit update-by-identifier endpoint");
    try {
        const { identifier, updates } = req.body;

        if (!identifier) {
            return res.status(400).json({ message: "Email or Username is required as identifier." });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ message: "Updates object is required." });
        }

        
        let { data: userData, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', identifier)
            .single();

        if (emailError || !userData) {
            const { data, error: usernameError } = await supabase
                .from('users')
                .select('*')
                .eq('name', identifier)
                .single();

            userData = data;
            if (usernameError || !userData) {
                return res.status(404).json({ message: "User not found with provided identifier." });
            }
        }

   
        const { data: updatedData, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('user_id', userData.user_id);


        if (updateError) {
            console.error("Update error:", updateError);
            return res.status(500).json({ error: "Failed to update user profile." });
        }

        return res.status(200).json({
            message: "User profile updated successfully.",
            updatedProfile: updatedData
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};
