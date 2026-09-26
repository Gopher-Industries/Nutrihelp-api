const supabase = require('../dbConnection');

const ALLOWED_ROLE_NAMES = new Set(['user', 'nutritionist', 'admin']);

function normalizeRoleName(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDisplayName(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (String(user?.name || '').trim()) return String(user.name).trim();
  const email = String(user?.email || '').trim();
  if (email) return email.split('@')[0];
  return `User ${user?.user_id || ''}`.trim();
}

async function getRoleMaps() {
  const { data, error } = await supabase.from('user_roles').select('id,role_name');
  if (error) throw error;

  const roleById = new Map();
  const idByRole = new Map();

  for (const row of data || []) {
    const roleName = normalizeRoleName(row?.role_name);
    const roleId = Number(row?.id);
    if (!roleName || !Number.isFinite(roleId)) continue;
    roleById.set(roleId, roleName);
    idByRole.set(roleName, roleId);
  }

  return { roleById, idByRole };
}

function mapUserRoleRow(user, roleById) {
  const roleId = Number(user?.role_id);
  const roleName = roleById.get(roleId) || 'unknown';

  return {
    user_id: Number(user?.user_id),
    email: user?.email || '',
    name: user?.name || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    display_name: toDisplayName(user),
    role_id: roleId,
    role_name: roleName,
    created_at: user?.registration_date || null,
    last_login: user?.last_login || null,
    account_status: user?.account_status || '',
  };
}

const listUserRoles = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 2000, 5000));
    const q = String(req.query.q || '').trim().toLowerCase();
    const roleFilter = normalizeRoleName(req.query.role);
    const createdFrom = normalizeDate(req.query.created_from);
    const createdTo = normalizeDate(req.query.created_to);

    const { roleById } = await getRoleMaps();

    let query = supabase
      .from('users')
      .select('user_id,email,name,first_name,last_name,role_id,registration_date,last_login,account_status')
      .order('user_id', { ascending: true })
      .limit(limit);

    if (roleFilter && roleFilter !== 'all') {
      const roleId = [...roleById.entries()].find(([, name]) => name === roleFilter)?.[0];
      if (roleId) query = query.eq('role_id', roleId);
    }

    if (createdFrom) query = query.gte('registration_date', createdFrom.toISOString());
    if (createdTo) {
      const end = new Date(createdTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('registration_date', end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const mapped = (data || []).map((row) => mapUserRoleRow(row, roleById));

    const filtered = mapped.filter((row) => {
      if (!q) return true;
      const haystack = [
        String(row.user_id || ''),
        row.email || '',
        row.display_name || '',
        row.role_name || '',
        row.account_status || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return res.status(200).json({
      success: true,
      data: filtered,
      meta: {
        total: mapped.length,
        visible: filtered.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch user roles.' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid user id.' });
    }

    const requestedRole = normalizeRoleName(req.body.role_name || req.body.role);
    if (!ALLOWED_ROLE_NAMES.has(requestedRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Allowed: user, nutritionist, admin.',
      });
    }

    if (Number(req.user?.userId) === userId) {
      return res.status(400).json({ success: false, error: 'You cannot change your own role.' });
    }

    const { roleById, idByRole } = await getRoleMaps();
    const targetRoleId = idByRole.get(requestedRole);
    if (!targetRoleId) {
      return res.status(400).json({ success: false, error: 'Target role is not configured.' });
    }

    const { data: exists, error: existsErr } = await supabase
      .from('users')
      .select('user_id,role_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existsErr) {
      return res.status(500).json({ success: false, error: existsErr.message });
    }

    if (!exists) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const { data: updatedRows, error: updateErr } = await supabase
      .from('users')
      .update({ role_id: targetRoleId })
      .eq('user_id', userId)
      .select('user_id,email,name,first_name,last_name,role_id,registration_date,last_login,account_status');

    if (updateErr) {
      return res.status(500).json({ success: false, error: updateErr.message });
    }

    const updated = Array.isArray(updatedRows) && updatedRows.length ? updatedRows[0] : null;
    if (!updated) {
      return res.status(500).json({ success: false, error: 'Failed to update role.' });
    }

    return res.status(200).json({
      success: true,
      message: 'User role updated.',
      data: mapUserRoleRow(updated, roleById),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update user role.' });
  }
};

module.exports = {
  listUserRoles,
  updateUserRole,
};
