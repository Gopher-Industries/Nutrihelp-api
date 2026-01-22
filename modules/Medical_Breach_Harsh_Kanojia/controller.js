const medicalBreachService = require('./service');

// Module Owner: Harsh Kanojia (Junior Cyber Security Lead)

exports.checkMedicalBreach = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        const results = await medicalBreachService.checkBreach(email);

        res.status(200).json({
            success: true,
            breachesFound: results.length,
            breaches: results,
            disclaimer: "This system checks publicly reported data breaches only and does not access hospital, clinical, or private medical databases."
        });

    } catch (error) {
        console.error('Controller Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
