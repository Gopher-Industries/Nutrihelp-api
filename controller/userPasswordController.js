const bcrypt = require('bcryptjs');
let updateUser = require("../model/updateUserPassword.js");
let getUser = require("../model/getUserPassword.js");
const authService = require("../services/authService");
const {
    authOk,
    authFail,
    AUTH_ERROR_CODES,
} = require("../services/authResponse");

const TRUSTED_DEVICE_COOKIE = authService.trustedDeviceCookieName || "trusted_device";

const PASSWORD_RULES = [
    {
        test: (password) => String(password || "").length >= 8,
        code: AUTH_ERROR_CODES.WEAK_PASSWORD,
        error: "New password must be at least 8 characters long",
    },
    {
        test: (password) => /[A-Z]/.test(String(password || "")),
        code: AUTH_ERROR_CODES.WEAK_PASSWORD,
        error: "New password must contain at least one uppercase letter",
    },
    {
        test: (password) => /[a-z]/.test(String(password || "")),
        code: AUTH_ERROR_CODES.WEAK_PASSWORD,
        error: "New password must contain at least one lowercase letter",
    },
    {
        test: (password) => /[0-9]/.test(String(password || "")),
        code: AUTH_ERROR_CODES.WEAK_PASSWORD,
        error: "New password must contain at least one number",
    },
    {
        test: (password) => /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(String(password || "")),
        code: AUTH_ERROR_CODES.WEAK_PASSWORD,
        error: "New password must contain at least one special character",
    },
];

const resolveAuthenticatedUserId = (req, res) => {
    const tokenUserId = req.user?.userId;
    const bodyUserId = req.body?.user_id;

    if (!tokenUserId) {
        authFail(res, {
            message: "Invalid or expired access token",
            code: AUTH_ERROR_CODES.TOKEN_INVALID,
            status: 401,
        });
        return null;
    }

    if (bodyUserId && String(bodyUserId) !== String(tokenUserId)) {
        authFail(res, {
            message: "Authenticated user does not match requested account",
            code: AUTH_ERROR_CODES.UNAUTHORIZED_USER_CONTEXT,
            status: 403,
        });
        return null;
    }

    return tokenUserId;
};

const findUserById = async (userId, res) => {
    const user = await getUser(userId);
    if (!user || user.length === 0) {
        authFail(res, {
            message: "User not found",
            code: AUTH_ERROR_CODES.USER_NOT_FOUND,
            status: 404,
        });
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
            return authFail(res, {
                message: "Current password is required",
                code: AUTH_ERROR_CODES.CURRENT_PASSWORD_REQUIRED,
                status: 400,
            });
        }

        const user = await findUserById(userId, res);
        if (!user) {
            return;
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) {
            return authFail(res, {
                message: "Current password is incorrect",
                code: AUTH_ERROR_CODES.CURRENT_PASSWORD_INVALID,
                status: 401,
            });
        }

        return authOk(
            res,
            { verified: true },
            { message: "Current password verified" }
        );
    } catch (error) {
        console.error(error);
        return authFail(res, {
            message: "Internal server error",
            code: AUTH_ERROR_CODES.INTERNAL_ERROR,
            status: 500,
        });
    }
};

const updateUserPassword = async (req, res) => {
    try {
        const userId = resolveAuthenticatedUserId(req, res);
        if (!userId) {
            return;
        }

        if (!req.body.password) {
            return authFail(res, {
                message: "Current password is required",
                code: AUTH_ERROR_CODES.CURRENT_PASSWORD_REQUIRED,
                status: 400,
            });
        }

        if (!req.body.new_password) {
            return authFail(res, {
                message: "New password is required",
                code: AUTH_ERROR_CODES.NEW_PASSWORD_REQUIRED,
                status: 400,
            });
        }

        const confirmPassword = req.body.confirm_password ?? req.body.new_password;

        if (!confirmPassword) {
            return authFail(res, {
                message: "Confirm password is required",
                code: AUTH_ERROR_CODES.CONFIRM_PASSWORD_REQUIRED,
                status: 400,
            });
        }

        if (req.body.new_password !== confirmPassword) {
            return authFail(res, {
                message: "Confirm password must match the new password",
                code: AUTH_ERROR_CODES.PASSWORD_MISMATCH,
                status: 400,
            });
        }

        if (req.body.password === req.body.new_password) {
            return authFail(res, {
                message: "New password must be different from your current password",
                code: AUTH_ERROR_CODES.PASSWORD_REUSE,
                status: 400,
            });
        }

        const passwordStrengthError = validateStrongPassword(req.body.new_password);
        if (passwordStrengthError) {
            return authFail(res, {
                message: passwordStrengthError.error,
                code: passwordStrengthError.code,
                status: 400,
            });
        }

        const user = await findUserById(userId, res);
        if (!user) {
            return;
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) {
            return authFail(res, {
                message: "Current password is incorrect",
                code: AUTH_ERROR_CODES.CURRENT_PASSWORD_INVALID,
                status: 401,
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.new_password, 10);

        await updateUser(userId, hashedPassword);
        await authService.logoutAll(userId, {
            reason: "password_change",
            deviceInfo: {
                ip: req.ip,
                userAgent: req.get?.("User-Agent") || req.headers?.["user-agent"] || "Unknown",
            },
        });
        if (res.clearCookie) {
            res.clearCookie(TRUSTED_DEVICE_COOKIE, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
            });
        }
        const requiresMfaLogin = Boolean(user.mfa_enabled);

        return authOk(
            res,
            {
                requireReauthentication: true,
                requireMfa: requiresMfaLogin,
                reauthenticationFlow: requiresMfaLogin ? "LOGIN_MFA" : "LOGIN",
            },
            { message: "Password updated successfully" }
        );
    } catch (error) {
        console.error(error);
        return authFail(res, {
            message: "Internal server error",
            code: AUTH_ERROR_CODES.INTERNAL_ERROR,
            status: 500,
        });
    }
};

const legacyPasswordHandler = async (req, res) => {
    if (
        req.body?.password &&
        req.body?.new_password &&
        req.body.new_password === req.body.password &&
        !req.body?.confirm_password
    ) {
        return verifyCurrentPassword(req, res);
    }

    if (req.body?.new_password && !req.body?.confirm_password) {
        req.body.confirm_password = req.body.new_password;
    }

    return updateUserPassword(req, res);
};

module.exports = { verifyCurrentPassword, updateUserPassword, legacyPasswordHandler };
