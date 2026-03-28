const bcrypt = require('bcryptjs');
let updateUser = require("../model/updateUserPassword.js");
let getUser = require("../model/getUserPassword.js");
const authService = require("../services/authService");

const PASSWORD_RULES = [
    {
        test: (password) => String(password || "").length >= 8,
        code: "WEAK_PASSWORD",
        error: "New password must be at least 8 characters long",
    },
    {
        test: (password) => /[A-Z]/.test(String(password || "")),
        code: "WEAK_PASSWORD",
        error: "New password must contain at least one uppercase letter",
    },
    {
        test: (password) => /[a-z]/.test(String(password || "")),
        code: "WEAK_PASSWORD",
        error: "New password must contain at least one lowercase letter",
    },
    {
        test: (password) => /[0-9]/.test(String(password || "")),
        code: "WEAK_PASSWORD",
        error: "New password must contain at least one number",
    },
    {
        test: (password) => /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(String(password || "")),
        code: "WEAK_PASSWORD",
        error: "New password must contain at least one special character",
    },
];

const jsonError = (res, status, error, code) =>
    res.status(status).json({ error, code });

const resolveAuthenticatedUserId = (req, res) => {
    const tokenUserId = req.user?.userId;
    const bodyUserId = req.body?.user_id;

    if (!tokenUserId) {
        jsonError(res, 401, "Invalid or expired access token", "TOKEN_INVALID");
        return null;
    }

    if (bodyUserId && String(bodyUserId) !== String(tokenUserId)) {
        jsonError(
            res,
            403,
            "Authenticated user does not match requested account",
            "UNAUTHORIZED_USER_CONTEXT"
        );
        return null;
    }

    return tokenUserId;
};

const findUserById = async (userId, res) => {
    const user = await getUser(userId);
    if (!user || user.length === 0) {
        jsonError(res, 404, "User not found", "USER_NOT_FOUND");
        return null;
    }

    return user[0];
};

const validateStrongPassword = (password) => {
    for (const rule of PASSWORD_RULES) {
        if (!rule.test(password)) {
            return { error: rule.error, code: rule.code };
        }
    }

    return null;
};

const verifyCurrentPassword = async (req, res) => {
    try {
        const userId = resolveAuthenticatedUserId(req, res);
        if (!userId) {
            return;
        }

        if (!req.body.password) {
            return jsonError(
                res,
                400,
                "Current password is required",
                "CURRENT_PASSWORD_REQUIRED"
            );
        }

        const user = await findUserById(userId, res);
        if (!user) {
            return;
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) {
            return jsonError(
                res,
                401,
                "Current password is incorrect",
                "CURRENT_PASSWORD_INVALID"
            );
        }

        return res.status(200).json({
            message: "Current password verified",
            verified: true,
        });
    } catch (error) {
        console.error(error);
        return jsonError(res, 500, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
};

const updateUserPassword = async (req, res) => {
    try {
        const userId = resolveAuthenticatedUserId(req, res);
        if (!userId) {
            return;
        }

        if (!req.body.password) {
            return jsonError(
                res,
                400,
                "Current password is required",
                "CURRENT_PASSWORD_REQUIRED"
            );
        }

        if (!req.body.new_password) {
            return jsonError(
                res,
                400,
                "New password is required",
                "NEW_PASSWORD_REQUIRED"
            );
        }

        if (req.body.password === req.body.new_password) {
            return jsonError(
                res,
                400,
                "New password must be different from your current password",
                "PASSWORD_REUSE"
            );
        }

        const passwordStrengthError = validateStrongPassword(req.body.new_password);
        if (passwordStrengthError) {
            return jsonError(
                res,
                400,
                passwordStrengthError.error,
                passwordStrengthError.code
            );
        }

        const user = await findUserById(userId, res);
        if (!user) {
            return;
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) {
            return jsonError(
                res,
                401,
                "Current password is incorrect",
                "CURRENT_PASSWORD_INVALID"
            );
        }

        const hashedPassword = await bcrypt.hash(req.body.new_password, 10);

        await updateUser(userId, hashedPassword);
        await authService.logoutAll(userId);

        return res.status(200).json({
            message: "Password updated successfully",
            code: "PASSWORD_UPDATED",
            require_reauthentication: true,
        });
    } catch (error) {
        console.error(error);
        return jsonError(res, 500, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
};

module.exports = { verifyCurrentPassword, updateUserPassword };
