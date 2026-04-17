const getBmi = async (req, res) => {
    try {
        const height = Number(req.query.height);
        const weight = Number(req.query.weight);

        // Validate parameters
        if (!height || !weight || height <= 0 || weight <= 0) {
            return res.status(400).json({
                error: "Invalid parameters. Height and weight must be positive numbers."
            });
        }

        // Calculate BMI
        const bmi = weight / (height * height);

        // simple daily water intake estimation (ml)
        const waterIntake = weight * 35; // 35 ml per kg

        return res.status(200).json({
            bmi: Number(bmi.toFixed(2)),
            recommendedWaterIntakeMl: waterIntake
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getBmi
};
