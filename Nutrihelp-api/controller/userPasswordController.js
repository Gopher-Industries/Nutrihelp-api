const bcrypt = require('bcryptjs');
let updateUser = require("../model/updateUserPassword.js");
let getUser = require("../model/getUserPassword.js");

const updateUserPassword = async (req, res) => {
    try {
        if (!req.body.user_id) {
            return res.status(400).send({ message: "User ID is required" });
        }

        if (!req.body.password) {
            return res.status(400).send({ message: "Current password is required" });
        }

        if (!req.body.new_password) {
            return res.status(400).send({ message: "New password is required" });
        }

        const user = await getUser(req.body.user_id);
        if (!user || user.length === 0) {
            return res
                .status(401)
                .json({ error: "Invalid user id" });
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user[0].password);
        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ error: "Invalid password" });
        }

        const hashedPassword = await bcrypt.hash(req.body.new_password, 10);

        await updateUser(
            req.body.user_id,
            hashedPassword
        );

        res.status(200).json({ message: "Password updaded successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { updateUserPassword };