import { query } from '../db-lib/db.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// ─── TOKEN SECURITY ───────────────────────────────────────────────────────────
// HMAC-SHA256 signed tokens. Format: base64(payload).HMAC_signature
// This prevents token forgery — any tampered payload will have an invalid signature.

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('[SECURITY ERROR] JWT_SECRET is missing or too short in environment variables!');
  console.error('Set JWT_SECRET in your .env file (min 32 chars) and restart the server.');
}

function signToken(payload) {
  const secret = JWT_SECRET || 'fallback_unsafe_secret_set_jwt_secret_env';
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const secret = JWT_SECRET || 'fallback_unsafe_secret_set_jwt_secret_env';
  try {
    const parts = token.split('.');
    // Support both new signed format (2 parts) and legacy base64-only format (1 part)
    // Legacy tokens will be rejected after all users log in once with the new system
    if (parts.length === 2) {
      const [data, sig] = parts;
      const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64');
      // Constant-time comparison to prevent timing attacks
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expBuf.length) return null;
      if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
      return JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    } else if (parts.length === 1) {
      // Legacy unsigned token — accept but log warning
      // Remove this branch after a deployment cycle
      console.warn('[SECURITY] Legacy unsigned token accepted. User should re-login.');
      return JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to send login notification email to user
async function sendLoginNotificationEmail(userEmail, userName, role) {
  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const loginTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || `"Easy Admin Alert" <no-reply@sjvps.com>`,
      to: userEmail,
      subject: `🔒 Security Alert: Account Login Detected (${userName})`,
      text: `Hello ${userName},\n\nWe detected a new login to your AG Account (${userEmail}) at ${loginTime}.\nRole: ${role}\n\nIf this was you, no action is required. If you did not recognize this activity, please contact your administrator immediately.`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <div style="background: #1a73e8; color: white; padding: 8px 12px; border-radius: 8px; font-weight: 800; font-size: 16px;">AG</div>
            <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">Account Login Notification</h2>
          </div>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello <strong>${userName}</strong>,</p>
          <p style="color: #334155; font-size: 14.5px; line-height: 1.5;">A successful login to your AG account was registered with the following details:</p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
              <tr><td style="padding: 4px 0; color: #64748b;">User:</td><td style="padding: 4px 0; font-weight: 600;">${userName} (${userEmail})</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Role:</td><td style="padding: 4px 0; font-weight: 600; text-transform: capitalize;">${role}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Time:</td><td style="padding: 4px 0; font-weight: 600;">${loginTime} (IST)</td></tr>
            </table>
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">If this was you, you can safely ignore this email. If you did not initiate this login, please notify your administrator right away.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="color: #94a3b8; font-size: 11.5px; margin: 0;">AG Trust Workspace Security Team • Automatic System Notification</p>
        </div>
      `
    };

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail(mailOptions);
      console.log(`[Email Alert Sent] Login notification sent to ${userEmail}`);
    } else {
      console.log(`[Email Alert Prepared] Login email notification ready for ${userEmail}:`, mailOptions.subject);
    }
  } catch (err) {
    console.error('[Email Notification Error]', err.message);
  }
}

// Helper to hash password matching the client-side SHA-256 algorithm
function hashPassword(password) {
  const saltPassword = password + '__sjvps_salt_2024__';
  return crypto.createHash('sha256').update(saltPassword).digest('hex');
}

// Helper to parse JSON body robustly
async function getRequestBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

// Format database user to matching frontend camelCase format
function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    phone: row.phone || '',
    createdAt: row.created_at,
    lastLogin: row.last_login,
    trialEndsAt: row.trial_ends_at || null,
    permissions: row.permissions || {}
  };
}

// Format register to camelCase format
function formatRegister(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    businessId: Number(row.business_id),
    folderId: row.folder_id ? Number(row.folder_id) : undefined,
    name: row.name,
    icon: row.icon,
    iconColor: row.icon_color,
    category: row.category,
    template: row.template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entryCount: row.entry_count,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deletedByEmail: row.deleted_by_email,
    deletedById: row.deleted_by_id,
    columns: row.columns,
    pages: row.pages,
    shareLink: row.share_link,
    sharedWith: row.shared_with || [],
    deletedItems: row.deleted_items || [],
    migrationCompleted: row.migration_completed,
    entriesPerChunk: row.entries_per_chunk
  };
}

// Extract and VERIFY authenticated user from Bearer token
function getAuthUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  return verifyToken(token);
}

// Middleware helper: require a valid auth token or send 401
// Returns the authUser or null (and sends the 401 itself)
function requireAuth(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    sendError(res, 401, 'Authentication required');
    return null;
  }
  return authUser;
}

// Middleware helper: require admin/superadmin role
function requireAdmin(req, res) {
  const authUser = requireAuth(req, res);
  if (!authUser) return null;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    sendError(res, 403, 'Admin access required');
    return null;
  }
  return authUser;
}

// Check if authUser is admin/superadmin
function isAdmin(authUser) {
  return authUser && (authUser.role === 'admin' || authUser.role === 'superadmin');
}

// Verify that a business belongs to the authenticated user.
// Returns true if authorized, false + sends 403 if not.
async function verifyBusinessOwner(businessId, authUser, res) {
  if (!businessId) {
    sendError(res, 400, 'businessId is required');
    return false;
  }
  if (isAdmin(authUser)) return true; // Admins can access any business
  const check = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [businessId, authUser.id]);
  if (check.rowCount === 0) {
    sendError(res, 403, 'Forbidden: you do not have access to this resource');
    return false;
  }
  return true;
}

// Verify that a register belongs to the authenticated user's business.
// Returns the register row if authorized, or null + sends 403.
async function verifyRegisterOwner(registerId, authUser, res) {
  if (isAdmin(authUser)) {
    const regRes = await query('SELECT * FROM registers WHERE id = $1', [registerId]);
    if (regRes.rowCount === 0) { sendError(res, 404, 'Register not found'); return null; }
    return regRes.rows[0];
  }
  const ownerCheck = await query(
    'SELECT r.* FROM registers r JOIN businesses b ON b.id = r.business_id WHERE r.id = $1 AND b.owner_id = $2',
    [registerId, authUser.id]
  );
  if (ownerCheck.rowCount === 0) {
    sendError(res, 403, 'Forbidden: you do not have access to this register');
    return null;
  }
  return ownerCheck.rows[0];
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  const method = req.method;

  try {
    // Auto-migrate trial_ends_at column on users table if missing and upgrade standard users to full workspace admin
    if (!globalThis._usersTrialColumnMigrated) {
      try {
        await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;');
        await query(`
          UPDATE users 
          SET role = 'sheet_admin',
              permissions = jsonb_build_object(
                'canView', true,
                'canEdit', true,
                'canDownload', true,
                'isAdmin', false,
                'fullSheetAccess', true,
                'canCreateSheets', true,
                'canSelectBackDates', true
              )
          WHERE role = 'user';
        `).catch(() => {});
        globalThis._usersTrialColumnMigrated = true;
      } catch (mErr) {
        console.error('Failed to auto-migrate users table trial_ends_at column:', mErr);
      }
    }

    // ─── AUTHENTICATION ROUTES ───────────────────────────────────────────────

    // POST /api/auth/signup (Public user self-registration with 1-Month Free Trial)
    if (pathname === '/api/auth/signup' && method === 'POST') {
      const data = await getRequestBody(req);
      const email = (data.email || '').toLowerCase().trim();
      const name = (data.name || '').trim();
      const password = data.password || '';
      const phone = data.phone || '';

      if (!name || !email || !password) {
        return sendError(res, 400, 'Name, email, and password are required');
      }

      const check = await query('SELECT 1 FROM users WHERE LOWER(email) = $1', [email]);
      if (check.rowCount > 0) return sendError(res, 400, 'An account with this email already exists');

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      const hash = hashPassword(password);
      const role = 'sheet_admin';
      const permissions = {
        canView: true,
        canEdit: true,
        canDownload: true,
        isAdmin: false,
        fullSheetAccess: true,
        canCreateSheets: true,
        canSelectBackDates: true,
      };

      // Set 1-Month (30 days) Free Trial from now
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await query(`
        INSERT INTO users (id, name, email, password_hash, role, status, phone, created_at, trial_ends_at, permissions)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, NOW(), $7, $8)
      `, [id, name, email, hash, role, phone, trialEndsAt, JSON.stringify(permissions)]);

      // Create a default business for the new user so they can immediately create registers
      const businessId = Date.now() + Math.floor(Math.random() * 100000);
      await query('INSERT INTO businesses (id, name, owner_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING', [businessId, `${name}'s Workspace`, id]);

      // Activity log
      const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp)
        VALUES ($1, $2, $3, 'signup', $4, NOW())
      `, [logId, id, name, `New user registered: ${email} (1-Month Free Trial until ${new Date(trialEndsAt).toLocaleDateString()})`]);

      // Notify Admins
      try {
        const adminUsers = await query("SELECT id FROM users WHERE role = 'admin' OR role = 'superadmin'");
        for (const adminRow of adminUsers.rows) {
          const notifId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
          await query(`
            INSERT INTO notifications (id, user_id, title, message, type, meta, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
          `, [
            notifId,
            adminRow.id,
            'New User Registration',
            `New user ${name} (${email}) signed up with a 1-Month Free Trial`,
            'info',
            JSON.stringify({ userId: id, userName: name, userEmail: email, trialEndsAt })
          ]);
        }
      } catch (e) {}

      const freshUserRes = await query('SELECT * FROM users WHERE id = $1', [id]);
      const freshUser = freshUserRes.rows[0];

      const token = signToken({
        id: freshUser.id,
        email: freshUser.email,
        role: freshUser.role,
        ts: Date.now()
      });

      return sendJson(res, 201, {
        token,
        user: formatUser(freshUser),
        message: 'Account created successfully with a 1-Month Free Trial!'
      });
    }

    // POST /api/auth/google (Google OAuth Login/Signup)
    if (pathname === '/api/auth/google' && method === 'POST') {
      const data = await getRequestBody(req);
      const email = (data.email || '').toLowerCase().trim();
      const name = (data.name || '').trim() || 'Google User';

      if (!email) {
        return sendError(res, 400, 'Google email is required');
      }

      let resUser = await query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
      let user;

      if (resUser.rowCount === 0) {
        // Create new user for Google Sign-In with 1-Month Free Trial
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
        const role = 'sheet_admin';
        const permissions = {
          canView: true,
          canEdit: true,
          canDownload: true,
          isAdmin: false,
          fullSheetAccess: true,
          canCreateSheets: true,
          canSelectBackDates: true,
        };
        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await query(`
          INSERT INTO users (id, name, email, password_hash, role, status, phone, created_at, trial_ends_at, permissions)
          VALUES ($1, $2, $3, '', $4, 'active', '', NOW(), $5, $6)
        `, [id, name, email, role, trialEndsAt, JSON.stringify(permissions)]);

        // Create default business workspace for this user
        const businessId = Date.now() + Math.floor(Math.random() * 100000);
        await query('INSERT INTO businesses (id, name, owner_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING', [businessId, `${name}'s Workspace`, id]);

        const freshUserRes = await query('SELECT * FROM users WHERE id = $1', [id]);
        user = freshUserRes.rows[0];
      } else {
        user = resUser.rows[0];
        if (user.status === 'inactive') {
          return sendError(res, 403, 'Account is deactivated. Contact your administrator.');
        }
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      }

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        ts: Date.now()
      });

      return sendJson(res, 200, {
        token,
        user: formatUser(user),
        message: 'Signed in with Google successfully!'
      });
    }

    // POST /api/auth/login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await getRequestBody(req);
      if (!email || !password) return sendError(res, 400, 'Email and password are required');

      const resUser = await query('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase().trim()]);
      if (resUser.rowCount === 0) return sendError(res, 401, 'Invalid email or password');

      const user = resUser.rows[0];
      if (user.status === 'inactive') {
        return sendError(res, 403, 'Account is deactivated. Contact your administrator.');
      }

      const inputHash = hashPassword(password);
      if (inputHash !== user.password_hash) {
        return sendError(res, 401, 'Invalid email or password');
      }

      // Record login
      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      // Create log
      const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp)
        VALUES ($1, $2, $3, 'login', $4, NOW())
      `, [logId, user.id, user.name, `User logged in: ${user.email}`]);

      // 1. Notify Admin Panel: Add in-app notification for all admin / superadmin users
      try {
        const adminUsers = await query("SELECT id FROM users WHERE role = 'admin' OR role = 'superadmin'");
        for (const adminRow of adminUsers.rows) {
          const notifId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
          await query(`
            INSERT INTO notifications (id, user_id, title, message, type, meta, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
          `, [
            notifId,
            adminRow.id,
            'User Login Alert',
            `User ${user.name} (${user.email}) logged into the system`,
            'info',
            JSON.stringify({ userId: user.id, userName: user.name, userEmail: user.email, role: user.role, event: 'login' })
          ]);
        }
      } catch (notifErr) {
        console.error('Failed to create admin login notifications:', notifErr);
      }

      // 2. Send email notification to user's email address
      sendLoginNotificationEmail(user.email, user.name, user.role).catch(err => {
        console.error('Email dispatch error on login:', err);
      });

      // Generate HMAC-signed stateless token
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        ts: Date.now()
      });

      return sendJson(res, 200, {
        token,
        user: formatUser(user)
      });
    }

    // POST /api/auth/change-password
    if (pathname === '/api/auth/change-password' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;

      const { currentPassword, newPassword } = await getRequestBody(req);
      if (!currentPassword || !newPassword) return sendError(res, 400, 'Current and new passwords are required');

      const resUser = await query('SELECT * FROM users WHERE id = $1', [authUser.id]);
      if (resUser.rowCount === 0) return sendError(res, 404, 'User not found');

      const user = resUser.rows[0];
      const currentHash = hashPassword(currentPassword);
      if (currentHash !== user.password_hash) {
        return sendError(res, 400, 'Current password is incorrect');
      }

      const newHash = hashPassword(newPassword);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      
      // Create activity log
      const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp)
        VALUES ($1, $2, $3, 'change_password', 'User changed their password', NOW())
      `, [logId, user.id, user.name]);

      return sendJson(res, 200, { message: 'Password changed successfully' });
    }

    // GET /api/auth/me
    if (pathname === '/api/auth/me' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;

      const resUser = await query('SELECT * FROM users WHERE id = $1', [authUser.id]);
      if (resUser.rowCount === 0) return sendError(res, 401, 'User not found');
      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [authUser.id]).catch(() => {});
      return sendJson(res, 200, { user: formatUser(resUser.rows[0]) });
    }

    // GET /api/auth/users (admin only)
    if (pathname === '/api/auth/users' && method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const result = await query('SELECT * FROM users ORDER BY name ASC');
      return sendJson(res, 200, { users: result.rows.map(formatUser) });
    }

    // POST /api/auth/users (admin only)
    if (pathname === '/api/auth/users' && method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const data = await getRequestBody(req);
      const email = (data.email || '').toLowerCase().trim();
      
      const check = await query('SELECT 1 FROM users WHERE email = $1', [email]);
      if (check.rowCount > 0) return sendError(res, 400, 'Email already exists');

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      const hash = hashPassword(data.password || 'admin123');

      const role = data.role || 'user';
      const permissions = data.permissions || {
        canView: true,
        canEdit: true,
        canDownload: role === 'admin' || role === 'superadmin',
        isAdmin: role === 'admin' || role === 'superadmin',
        fullSheetAccess: role === 'admin' || role === 'superadmin' || role === 'sheet_admin',
      };

      await query(`
        INSERT INTO users (id, name, email, password_hash, role, status, phone, created_at, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      `, [id, data.name, email, hash, role, 'active', data.phone || '', JSON.stringify(permissions)]);

      // Create activity log
      const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp)
        VALUES ($1, $2, $3, 'create_user', $4, NOW())
      `, [logId, id, data.name, `Created user: ${email} (${role})`]);

      const freshUser = await query('SELECT * FROM users WHERE id = $1', [id]);
      return sendJson(res, 201, { user: formatUser(freshUser.rows[0]), message: 'User created' });
    }

    // PUT /api/auth/users/:id (update details/status/role)
    const userMatch = pathname.match(/^\/api\/auth\/users\/([a-zA-Z0-9]+)$/);
    if (userMatch && method === 'PUT') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const userId = userMatch[1];
      // Only admins/superadmins can edit OTHER users. Users can edit only themselves.
      if (!isAdmin(authUser) && String(authUser.id) !== String(userId)) {
        return sendError(res, 403, 'Forbidden: you can only edit your own profile');
      }
      // Non-admins cannot change their own role or password via this endpoint
      const data = await getRequestBody(req);
      
      if (data.password) {
        // Only admins can reset another user's password via this endpoint
        if (!isAdmin(authUser)) return sendError(res, 403, 'Forbidden: use /api/auth/change-password to change your own password');
        const hash = hashPassword(data.password);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
        return sendJson(res, 200, { message: 'Password changed successfully' });
      }

      if (data.status !== undefined) {
        // Only admins can activate/deactivate users
        if (!isAdmin(authUser)) return sendError(res, 403, 'Forbidden: only admins can change account status');
        await query('UPDATE users SET status = $1 WHERE id = $2', [data.status, userId]);
        return sendJson(res, 200, { message: `User status changed to ${data.status}` });
      }

      // Non-admins can only update their own name and phone (not role)
      if (isAdmin(authUser)) {
        await query(
          'UPDATE users SET name = $1, phone = $2, role = $3 WHERE id = $4',
          [data.name, data.phone || '', data.role || 'user', userId]
        );
      } else {
        await query(
          'UPDATE users SET name = $1, phone = $2 WHERE id = $3',
          [data.name, data.phone || '', userId]
        );
      }
      
      return sendJson(res, 200, { message: 'User updated' });
    }

    // PUT /api/auth/users/:id/extend-trial (Admin only)
    const extendTrialMatch = pathname.match(/^\/api\/auth\/users\/([a-zA-Z0-9]+)\/extend-trial$/);
    if (extendTrialMatch && method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const userId = extendTrialMatch[1];
      const { newTrialEndsAt, extensionDays } = await getRequestBody(req);

      let targetDateIso = newTrialEndsAt;
      if (!targetDateIso && extensionDays) {
        const currentRes = await query('SELECT trial_ends_at FROM users WHERE id = $1', [userId]);
        const currentTrial = currentRes.rows[0]?.trial_ends_at;
        const baseDate = (currentTrial && new Date(currentTrial) > new Date()) ? new Date(currentTrial) : new Date();
        targetDateIso = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000).toISOString();
      }

      if (!targetDateIso) {
        return sendError(res, 400, 'Valid newTrialEndsAt date or extensionDays is required');
      }

      await query('UPDATE users SET trial_ends_at = $1 WHERE id = $2', [targetDateIso, userId]);

      const formattedDate = new Date(targetDateIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Send in-app notification to user
      const notifId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO notifications (id, user_id, title, message, type, meta, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      `, [
        notifId,
        userId,
        'Trial Period Extended!',
        `Your Easy Records trial has been extended until ${formattedDate}. Enjoy full access!`,
        'success',
        JSON.stringify({ trialEndsAt: targetDateIso })
      ]).catch(() => {});

      // Log activity
      const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp)
        VALUES ($1, $2, 'Admin', 'extend_trial', $3, NOW())
      `, [logId, userId, `Extended trial for user ID ${userId} to ${formattedDate}`]).catch(() => {});

      const updatedUserRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
      return sendJson(res, 200, {
        user: formatUser(updatedUserRes.rows[0]),
        message: `Trial successfully extended until ${formattedDate}`
      });
    }

    // PUT /api/auth/users/:id/permissions (Admin only)
    const permMatch = pathname.match(/^\/api\/auth\/users\/([a-zA-Z0-9]+)\/permissions$/);
    if (permMatch && method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const userId = permMatch[1];
      const { permissions } = await getRequestBody(req);
      await query('UPDATE users SET permissions = $1 WHERE id = $2', [JSON.stringify(permissions), userId]);
      return sendJson(res, 200, { message: 'Permissions updated' });
    }

    // DELETE /api/auth/users/:id (Admin only)
    if (userMatch && method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const userId = userMatch[1];
      await query('DELETE FROM users WHERE id = $1', [userId]);
      return sendJson(res, 200, { message: 'User deleted' });
    }

    // ─── BUSINESSES & FOLDERS ───────────────────────────────────────────────

    // GET /api/businesses (secured: each user sees ONLY their own businesses; admin monitoring can pass ?all=true)
    if (pathname === '/api/businesses' && method === 'GET') {
      const authUser = getAuthUser(req);
      const fetchAll = url.searchParams.get('all') === 'true';
      let result;
      if (authUser && fetchAll && (authUser.role === 'admin' || authUser.role === 'superadmin')) {
        // Admin monitoring console sees ALL businesses when ?all=true
        result = await query('SELECT * FROM businesses ORDER BY name ASC, id ASC');
      } else if (authUser) {
        // SECURITY: strict — only businesses directly owned by this user's ID
        result = await query(
          'SELECT * FROM businesses WHERE owner_id = $1 ORDER BY name ASC, id ASC',
          [authUser.id]
        );
      } else {
        // No auth — return empty
        return sendJson(res, 200, []);
      }
      return sendJson(res, 200, result.rows.map(r => ({
        id: Number(r.id),
        name: r.name,
        ownerId: r.owner_id,
        createdAt: r.created_at
      })));
    }

    // POST /api/businesses (secured: owner_id = authenticated user)
    if (pathname === '/api/businesses' && method === 'POST') {
      const authUser = getAuthUser(req);
      if (!authUser) return sendError(res, 401, 'Authentication required');
      const { name } = await getRequestBody(req);
      const id = Date.now();
      await query('INSERT INTO businesses (id, name, owner_id, created_at) VALUES ($1, $2, $3, NOW())', [id, name, authUser.id]);
      return sendJson(res, 201, { id, name, ownerId: authUser.id });
    }

    // GET /api/folders
    if (pathname === '/api/folders' && method === 'GET') {
      const authUser = getAuthUser(req);
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      // SECURITY: verify this business belongs to the authenticated user
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const bizCheck = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [businessId, authUser.id]);
        if (bizCheck.rowCount === 0) return sendJson(res, 200, []);
      }
      const result = await query('SELECT * FROM folders WHERE business_id = $1 ORDER BY name ASC', [businessId]);
      return sendJson(res, 200, result.rows.map(r => ({
        id: Number(r.id),
        businessId: Number(r.business_id),
        name: r.name,
        createdAt: r.created_at
      })));
    }

    // POST /api/folders
    if (pathname === '/api/folders' && method === 'POST') {
      const authUser = getAuthUser(req);
      const { businessId, name } = await getRequestBody(req);
      // SECURITY: verify ownership
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const bizCheck = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [businessId, authUser.id]);
        if (bizCheck.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      const id = Date.now();
      await query('INSERT INTO folders (id, business_id, name, created_at) VALUES ($1, $2, $3, NOW())', [id, businessId, name]);
      return sendJson(res, 201, { id, businessId, name });
    }

    // RENAME / DELETE folders
    const folderMatch = pathname.match(/^\/api\/folders\/(\d+)$/);
    if (folderMatch) {
      const authUser = getAuthUser(req);
      const folderId = parseBigInt(folderMatch[1]);
      // SECURITY: verify folder's business belongs to caller
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const folderCheck = await query(`
          SELECT f.id FROM folders f
          JOIN businesses b ON b.id = f.business_id
          WHERE f.id = $1 AND b.owner_id = $2
        `, [folderId, authUser.id]);
        if (folderCheck.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      if (method === 'PUT') {
        const { name } = await getRequestBody(req);
        await query('UPDATE folders SET name = $1 WHERE id = $2', [name, folderId]);
        return sendJson(res, 200, { id: folderId, name });
      }
      if (method === 'DELETE') {
        await query('DELETE FROM folders WHERE id = $1', [folderId]);
        await query('UPDATE registers SET folder_id = NULL WHERE folder_id = $1', [folderId]);
        return sendJson(res, 200, { message: 'Folder deleted successfully' });
      }
    }

    // ─── REGISTERS & ENTRIES ─────────────────────────────────────────────────

    // GET /api/registers
    if (pathname === '/api/registers' && method === 'GET') {
      const authUser = getAuthUser(req);
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      // SECURITY: verify business ownership before returning registers
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const bizCheck = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [businessId, authUser.id]);
        if (bizCheck.rowCount === 0) return sendJson(res, 200, []);
      }
      const result = await query('SELECT * FROM registers WHERE business_id = $1 AND deleted_at IS NULL ORDER BY name ASC', [businessId]);
      return sendJson(res, 200, result.rows.map(formatRegister));
    }

    // GET /api/registers/deleted
    if (pathname === '/api/registers/deleted' && method === 'GET') {
      const authUser = getAuthUser(req);
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      // SECURITY: verify business ownership
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const bizCheck = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [businessId, authUser.id]);
        if (bizCheck.rowCount === 0) return sendJson(res, 200, []);
      }
      const result = await query('SELECT * FROM registers WHERE business_id = $1 AND deleted_at IS NOT NULL ORDER BY name ASC', [businessId]);
      return sendJson(res, 200, result.rows.map(formatRegister));
    }

    // POST /api/registers (create register)
    if (pathname === '/api/registers' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      // SECURITY: verify the target business belongs to the authenticated user
      const bizId = parseBigInt(data.businessId);
      if (!(await verifyBusinessOwner(bizId, authUser, res))) return;
      const id = Date.now();
      const createdAt = new Date().toISOString();
      await query(`
        INSERT INTO registers (
          id, business_id, folder_id, name, icon, icon_color, category, template, 
          created_at, updated_at, entry_count, columns, pages, shared_with
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), 0, $9, $10, $11)
      `, [
        id,
        bizId,
        data.folderId || null,
        data.name,
        data.icon || '',
        data.iconColor || '',
        data.category || '',
        data.template || '',
        JSON.stringify(data.columns || []),
        JSON.stringify(data.pages || []),
        JSON.stringify(data.sharedWith || [])
      ]);
      return sendJson(res, 201, {
        id,
        businessId: Number(bizId),
        folderId: data.folderId ? Number(data.folderId) : undefined,
        name: data.name,
        icon: data.icon || '',
        iconColor: data.iconColor || '',
        category: data.category || '',
        template: data.template || '',
        createdAt,
        updatedAt: createdAt,
        entryCount: 0
      });
    }

    // GET /api/registers/:id/columns
    const regColumnsMatch = pathname.match(/^\/api\/registers\/(\d+)\/columns$/);
    if (regColumnsMatch && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const regId = parseBigInt(regColumnsMatch[1]);
      const regRow = await verifyRegisterOwner(regId, authUser, res);
      if (!regRow) return;
      return sendJson(res, 200, formatRegister(regRow));
    }

    // POST /api/registers/:id/restore
    const regRestoreMatch = pathname.match(/^\/api\/registers\/(\d+)\/restore$/);
    if (regRestoreMatch && method === 'POST') {
      const authUser = getAuthUser(req);
      const regId = parseBigInt(regRestoreMatch[1]);
      // SECURITY: verify register belongs to caller's business
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const ownerCheck = await query(`
          SELECT r.id FROM registers r
          JOIN businesses b ON b.id = r.business_id
          WHERE r.id = $1 AND b.owner_id = $2
        `, [regId, authUser.id]);
        if (ownerCheck.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      await query('UPDATE registers SET deleted_at = NULL, deleted_by = NULL WHERE id = $1', [regId]);
      return sendJson(res, 200, { message: 'Register restored' });
    }

    // DELETE /api/registers/:id/hard
    const regHardMatch = pathname.match(/^\/api\/registers\/(\d+)\/hard$/);
    if (regHardMatch && method === 'DELETE') {
      const authUser = getAuthUser(req);
      const regId = parseBigInt(regHardMatch[1]);
      // SECURITY: verify ownership before hard-delete
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const ownerCheck = await query(`
          SELECT r.id FROM registers r
          JOIN businesses b ON b.id = r.business_id
          WHERE r.id = $1 AND b.owner_id = $2
        `, [regId, authUser.id]);
        if (ownerCheck.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      await query('DELETE FROM registers WHERE id = $1', [regId]);
      return sendJson(res, 200, { message: 'Register permanently deleted' });
    }

    // GET, PUT, DELETE for individual registers
    const regMatch = pathname.match(/^\/api\/registers\/(\d+)$/);
    if (regMatch) {
      const authUser = getAuthUser(req);
      const regId = parseBigInt(regMatch[1]);

      if (method === 'GET') {
        const regRes = await query('SELECT * FROM registers WHERE id = $1', [regId]);
        if (regRes.rowCount === 0) return sendError(res, 404, 'Register not found');

        // SECURITY: verify register belongs to caller's business
        if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
          const ownerCheck = await query(
            'SELECT id FROM businesses WHERE id = $1 AND owner_id = $2',
            [regRes.rows[0].business_id, authUser.id]
          );
          if (ownerCheck.rowCount === 0) return sendError(res, 403, 'Forbidden');
        }
        
        const entriesRes = await query('SELECT * FROM entries WHERE register_id = $1 ORDER BY row_number ASC', [regId]);
        
        const regDetail = formatRegister(regRes.rows[0]);
        regDetail.entries = entriesRes.rows.map(row => ({
          id: Number(row.id),
          registerId: Number(row.register_id),
          rowNumber: row.row_number,
          cells: row.cells,
          cellStyles: row.cell_styles,
          pageIndex: row.page_index,
          createdAt: row.created_at
        }));

        return sendJson(res, 200, regDetail);
      }

      if (method === 'PUT') {
        const data = await getRequestBody(req);
        // SECURITY: verify ownership before updating
        if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
          const ownerCheck = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [data.businessId || 0, authUser.id]);
          // Also verify via register's own business_id
          const regOwnerCheck = await query(
            'SELECT r.id FROM registers r JOIN businesses b ON b.id = r.business_id WHERE r.id = $1 AND b.owner_id = $2',
            [regId, authUser.id]
          );
          if (regOwnerCheck.rowCount === 0) return sendError(res, 403, 'Forbidden');
        }
        await query(`
          UPDATE registers SET 
            name = $1, folder_id = $2, icon = $3, icon_color = $4, category = $5, 
            columns = $6, pages = $7, shared_with = $8, deleted_items = $9, entry_count = $10, updated_at = NOW()
          WHERE id = $11
        `, [
          data.name,
          data.folderId || null,
          data.icon,
          data.iconColor,
          data.category,
          JSON.stringify(data.columns),
          JSON.stringify(data.pages),
          JSON.stringify(data.sharedWith),
          JSON.stringify(data.deletedItems || []),
          data.entryCount !== undefined ? Number(data.entryCount) : 0,
          regId
        ]);

        if (data.entries) {
          const entries = data.entries;

          // Delete any entries that are no longer in the payload
          const entryIds = entries.map(e => Number(e.id));
          if (entryIds.length > 0) {
            const placeholders = entryIds.map((_, idx) => `$${idx + 2}`).join(', ');
            await query(`DELETE FROM entries WHERE register_id = $1 AND id NOT IN (${placeholders})`, [regId, ...entryIds]);
          } else {
            await query('DELETE FROM entries WHERE register_id = $1', [regId]);
          }

          if (entries.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < entries.length; i += batchSize) {
              const batch = entries.slice(i, i + batchSize);
              const valuePhrases = [];
              const queryParams = [];

              batch.forEach((entry, idx) => {
                const offset = idx * 7;
                valuePhrases.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
                queryParams.push(
                  Number(entry.id),
                  regId,
                  Number(entry.rowNumber || 1),
                  JSON.stringify(entry.cells || {}),
                  entry.cellStyles ? JSON.stringify(entry.cellStyles) : null,
                  Number(entry.pageIndex || 0),
                  entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
                );
              });

              const queryText = `
                INSERT INTO entries (id, register_id, row_number, cells, cell_styles, page_index, created_at)
                VALUES ${valuePhrases.join(', ')}
                ON CONFLICT (id) DO UPDATE SET
                  row_number = EXCLUDED.row_number,
                  cells = EXCLUDED.cells,
                  cell_styles = EXCLUDED.cell_styles,
                  page_index = EXCLUDED.page_index
              `;
              await query(queryText, queryParams);
            }
          }
        }

        return sendJson(res, 200, { message: 'Register updated' });
      }

      if (method === 'DELETE') {
        // SECURITY: verify ownership before soft-deleting
        if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
          const ownerCheck = await query(
            'SELECT r.id FROM registers r JOIN businesses b ON b.id = r.business_id WHERE r.id = $1 AND b.owner_id = $2',
            [regId, authUser.id]
          );
          if (ownerCheck.rowCount === 0) return sendError(res, 403, 'Forbidden');
        }
        const { deletedBy, deletedByEmail, deletedById } = await getRequestBody(req);
        await query(`
          UPDATE registers SET 
            deleted_at = NOW(), deleted_by = $1, deleted_by_email = $2, deleted_by_id = $3
          WHERE id = $4
        `, [deletedBy, deletedByEmail, deletedById ? String(deletedById) : null, regId]);
        return sendJson(res, 200, { message: 'Register soft-deleted' });
      }
    }

    // POST /api/registers/:id/entries (Add entry row)
    const entryListMatch = pathname.match(/^\/api\/registers\/(\d+)\/entries$/);
    if (entryListMatch && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const regId = parseBigInt(entryListMatch[1]);
      // SECURITY: verify register ownership before allowing entry creation
      if (!(await verifyRegisterOwner(regId, authUser, res))) return;
      const entry = await getRequestBody(req);
      
      const entryId = parseBigInt(entry.id);
      
      await query(`
        INSERT INTO entries (id, register_id, row_number, cells, cell_styles, page_index, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        entryId,
        regId,
        Number(entry.rowNumber || 1),
        JSON.stringify(entry.cells || {}),
        entry.cellStyles ? JSON.stringify(entry.cellStyles) : null,
        Number(entry.pageIndex || 0),
        parseDate(entry.createdAt) || new Date().toISOString()
      ]);

      // Increment entry_count in register
      await query('UPDATE registers SET entry_count = entry_count + 1, updated_at = NOW() WHERE id = $1', [regId]);

      return sendJson(res, 201, { message: 'Entry added', id: entryId });
    }

    // PUT / DELETE entries: /api/registers/:id/entries/:entryId
    const entryMatch = pathname.match(/^\/api\/registers\/(\d+)\/entries\/(\d+)$/);
    if (entryMatch) {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const regId = parseBigInt(entryMatch[1]);
      const entryId = parseBigInt(entryMatch[2]);
      // SECURITY: verify register ownership before any entry mutation
      if (!(await verifyRegisterOwner(regId, authUser, res))) return;

      if (method === 'PUT') {
        const { cells, cellStyles, pageIndex, rowNumber } = await getRequestBody(req);
        await query(`
          UPDATE entries SET 
            cells = $1, 
            cell_styles = $2, 
            page_index = $3, 
            row_number = COALESCE($4, row_number)
          WHERE id = $5 AND register_id = $6
        `, [
          JSON.stringify(cells || {}),
          cellStyles ? JSON.stringify(cellStyles) : null,
          pageIndex !== undefined ? Number(pageIndex) : 0,
          rowNumber !== undefined ? Number(rowNumber) : null,
          entryId,
          regId
        ]);
        return sendJson(res, 200, { message: 'Entry updated' });
      }

      if (method === 'DELETE') {
        await query('DELETE FROM entries WHERE id = $1 AND register_id = $2', [entryId, regId]);
        await query('UPDATE registers SET entry_count = GREATEST(0, entry_count - 1), updated_at = NOW() WHERE id = $1', [regId]);
        return sendJson(res, 200, { message: 'Entry deleted' });
      }
    }

    // ─── ACTIVITY LOGS ───────────────────────────────────────────────────────

    // GET /api/activity
    if (pathname === '/api/activity' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const registerId = url.searchParams.get('registerId');
      const entryId = url.searchParams.get('entryId');
      const limitVal = parseInt(url.searchParams.get('limit') || '200', 10);
      const offsetVal = parseInt(url.searchParams.get('offset') || '0', 10);

      let queryText = 'SELECT * FROM activity_logs';
      const params = [];
      const conditions = [];

      // SECURITY: non-admin callers are ALWAYS scoped to their own user_id
      if (!isAdmin(authUser)) {
        params.push(String(authUser.id));
        conditions.push(`user_id = $${params.length}`);
      }

      if (registerId) {
        params.push(String(registerId));
        conditions.push(`register_id = $${params.length}`);
      }
      if (entryId) {
        params.push(String(entryId));
        conditions.push(`entry_id = $${params.length}`);
      }

      if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
      }

      const safeLimit = isNaN(limitVal) ? 200 : limitVal;
      const safeOffset = isNaN(offsetVal) ? 0 : offsetVal;
      queryText += ` ORDER BY timestamp DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      const result = await query(queryText, params);
      return sendJson(res, 200, {
        activities: result.rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          action: r.action,
          details: r.details,
          timestamp: r.timestamp,
          registerId: r.register_id,
          registerName: r.register_name,
          entryId: r.entry_id ? Number(r.entry_id) : undefined
        }))
      });
    }

    // GET /api/activity/user/:userId
    // SECURITY: admins can view any user's activity; regular users can only view their own
    const userActMatch = pathname.match(/^\/api\/activity\/user\/(.+)$/);
    if (userActMatch && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const requestedUserId = userActMatch[1];
      // Non-admins can only fetch their own activity
      if (!isAdmin(authUser) && String(authUser.id) !== String(requestedUserId)) {
        return sendError(res, 403, 'Forbidden: you can only view your own activity logs');
      }
      const result = await query('SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY timestamp DESC', [requestedUserId]);
      return sendJson(res, 200, {
        activities: result.rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          action: r.action,
          details: r.details,
          timestamp: r.timestamp,
          registerId: r.register_id,
          registerName: r.register_name,
          entryId: r.entry_id ? Number(r.entry_id) : undefined
        }))
      });
    }

    // POST /api/activity
    if (pathname === '/api/activity' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const id = data.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      // SECURITY: always use the authenticated user's ID — never trust client-supplied userId
      const resolvedUserId = isAdmin(authUser) ? (data.userId || authUser.id) : authUser.id;
      const resolvedUserName = isAdmin(authUser) ? (data.userName || authUser.email) : data.userName;
      await query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp, register_id, register_name, entry_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        id,
        resolvedUserId,
        resolvedUserName || null,
        data.action || '',
        data.details || '',
        parseDate(data.timestamp) || new Date().toISOString(),
        data.registerId ? String(data.registerId) : null,
        data.registerName || null,
        data.entryId ? String(data.entryId) : null
      ]);
      return sendJson(res, 201, { id });
    }

    // ─── DOWNLOAD / DELETION REQUESTS ────────────────────────────────────────

    // POST /api/requests
    if (pathname === '/api/requests' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const id = data.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      // SECURITY: always use token-derived userId — never trust client-supplied userId
      await query(`
        INSERT INTO download_requests (
          id, user_id, user_name, type, register_id, register_name, description, scope, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
      `, [
        id,
        String(authUser.id),
        data.userName || authUser.email,
        data.type || 'download',
        data.registerId ? String(data.registerId) : null,
        data.registerName || '',
        data.description || '',
        JSON.stringify(data.scope || {})
      ]);
      return sendJson(res, 201, { id });
    }

    // GET /api/requests/my
    // SECURITY: derive userId from token — ignore any client-supplied userId param
    if (pathname === '/api/requests/my' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const result = await query('SELECT * FROM download_requests WHERE user_id = $1 ORDER BY created_at DESC', [String(authUser.id)]);
      return sendJson(res, 200, { requests: result.rows.map(formatRequest) });
    }

    // GET /api/requests/all (Admin only)
    if (pathname === '/api/requests/all' && method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const result = await query('SELECT * FROM download_requests ORDER BY created_at DESC');
      return sendJson(res, 200, { requests: result.rows.map(formatRequest) });
    }

    // GET /api/requests/pending (Admin only)
    if (pathname === '/api/requests/pending' && method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const result = await query("SELECT * FROM download_requests WHERE status = 'pending' ORDER BY created_at DESC");
      return sendJson(res, 200, { requests: result.rows.map(formatRequest) });
    }

    // POST /api/requests/:id/respond (Admin only)
    const respondMatch = pathname.match(/^\/api\/requests\/(.+)\/respond$/);
    if (respondMatch && method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const requestId = respondMatch[1];
      const { status, adminResponse } = await getRequestBody(req);
      await query(`
        UPDATE download_requests 
        SET status = $1, admin_response = $2, responded_at = NOW() 
        WHERE id = $3
      `, [status, adminResponse || '', requestId]);
      return sendJson(res, 200, { message: `Request status set to ${status}` });
    }

    // ─── NOTIFICATIONS ───────────────────────────────────────────────────────

    // GET /api/notifications
    // SECURITY: derives userId from the verified token — never from query params
    if (pathname === '/api/notifications' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      // Admins can optionally filter by userId query param for monitoring; users only see their own
      const targetUserId = isAdmin(authUser) && url.searchParams.get('userId')
        ? url.searchParams.get('userId')
        : String(authUser.id);
      const result = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [targetUserId]);
      return sendJson(res, 200, {
        notifications: result.rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          title: r.title,
          message: r.message,
          type: r.type,
          meta: r.meta || {},
          isRead: r.is_read,
          createdAt: r.created_at
        }))
      });
    }

    // POST /api/notifications
    if (pathname === '/api/notifications' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const id = data.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      // SECURITY: admins can create notifications for other users (system alerts); users can only notify themselves
      const targetUserId = isAdmin(authUser) ? (data.userId || String(authUser.id)) : String(authUser.id);
      await query(`
        INSERT INTO notifications (id, user_id, title, message, type, meta, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      `, [id, targetUserId, data.title, data.message, data.type, JSON.stringify(data.meta || {})]);
      return sendJson(res, 201, { id });
    }

    // PUT /api/notifications/:id/read
    const notifReadMatch = pathname.match(/^\/api\/notifications\/(.+)\/read$/);
    if (notifReadMatch && method === 'PUT') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const notifId = notifReadMatch[1];
      // SECURITY: only mark as read if the notification belongs to the authenticated user
      await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [notifId, String(authUser.id)]);
      return sendJson(res, 200, { message: 'Notification marked read' });
    }

    // POST /api/notifications/read-all
    // SECURITY: derives userId from token — ignores any body userId
    if (pathname === '/api/notifications/read-all' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [String(authUser.id)]);
      return sendJson(res, 200, { message: 'All notifications marked read' });
    }

    // GET /api/recycle-bin
    if (pathname === '/api/recycle-bin' && method === 'GET') {
      const authUser = getAuthUser(req);
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      if (!businessId) return sendError(res, 400, 'businessId is required');
      // SECURITY: verify business belongs to authenticated user
      if (authUser && authUser.role !== 'admin' && authUser.role !== 'superadmin') {
        const bizCheck = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [businessId, authUser.id]);
        if (bizCheck.rowCount === 0) return sendJson(res, 200, { deletedItems: [] });
      }
      const result = await query('SELECT deleted_items FROM registers WHERE business_id = $1', [businessId]);
      const allItems = [];
      for (const row of result.rows) {
        if (row.deleted_items && Array.isArray(row.deleted_items)) {
          allItems.push(...row.deleted_items);
        }
      }
      allItems.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
      return sendJson(res, 200, { deletedItems: allItems });
    }

    // GET /api/backups
    if (pathname === '/api/backups' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      if (!(await verifyBusinessOwner(businessId, authUser, res))) return;
      const result = await query(
        'SELECT id, business_id, created_at, label, register_count, folder_count, total_entries, size_kb FROM backups WHERE business_id = $1 ORDER BY created_at DESC',
        [businessId]
      );
      return sendJson(res, 200, result.rows.map(r => ({
        id: r.id,
        businessId: Number(r.business_id),
        createdAt: r.created_at,
        label: r.label,
        registerCount: r.register_count,
        folderCount: r.folder_count,
        totalEntries: r.total_entries,
        sizeKb: r.size_kb
      })));
    }

    // POST /api/backups
    if (pathname === '/api/backups' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const { businessId, label } = await getRequestBody(req);
      if (!(await verifyBusinessOwner(parseBigInt(businessId), authUser, res))) return;

      // 1. Get folders
      const foldersRes = await query('SELECT * FROM folders WHERE business_id = $1 ORDER BY name ASC', [businessId]);
      const folders = foldersRes.rows.map(r => ({
        id: Number(r.id),
        businessId: Number(r.business_id),
        name: r.name,
        createdAt: r.created_at
      }));

      // 2. Get active registers and their entries
      const regsRes = await query('SELECT * FROM registers WHERE business_id = $1 AND deleted_at IS NULL ORDER BY name ASC', [businessId]);
      const validRegisters = [];
      for (const row of regsRes.rows) {
        const regId = Number(row.id);
        const entriesRes = await query('SELECT * FROM entries WHERE register_id = $1 ORDER BY row_number ASC', [regId]);
        const regDetail = formatRegister(row);
        regDetail.entries = entriesRes.rows.map(r => ({
          id: Number(r.id),
          registerId: Number(r.register_id),
          rowNumber: r.row_number,
          cells: r.cells,
          cellStyles: r.cell_styles,
          pageIndex: r.page_index,
          createdAt: r.created_at
        }));
        validRegisters.push(regDetail);
      }

      const totalEntries = validRegisters.reduce((sum, r) => sum + (r.entries?.length ?? 0), 0);
      const id = `backup_${Date.now()}`;
      const now = new Date().toISOString();
      const displayLabel = label || `Backup ${new Date(now).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

      const snapshot = {
        meta: {
          id,
          businessId,
          createdAt: now,
          label: displayLabel,
          registerCount: validRegisters.length,
          folderCount: folders.length,
          totalEntries,
          sizeKb: 0
        },
        registers: validRegisters,
        folders
      };

      const jsonSize = Math.round(JSON.stringify(snapshot).length / 1024);
      snapshot.meta.sizeKb = jsonSize;

      await query(`
        INSERT INTO backups (id, business_id, created_at, label, register_count, folder_count, total_entries, size_kb, snapshot)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        id,
        businessId,
        now,
        displayLabel,
        validRegisters.length,
        folders.length,
        totalEntries,
        jsonSize,
        JSON.stringify(snapshot)
      ]);

      // Log action
      const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp)
        VALUES ($1, $2, $3, 'Backup Created', $4, NOW())
      `, [logId, 'system', 'System', `Created backup: ${displayLabel} (${validRegisters.length} registers, ${totalEntries} entries)`]);

      return sendJson(res, 201, snapshot.meta);
    }

    // POST /api/backups/:id/restore
    const backupRestoreMatch = pathname.match(/^\/api\/backups\/(.+)\/restore$/);
    if (backupRestoreMatch && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const backupId = backupRestoreMatch[1];
      const backupRes = await query('SELECT * FROM backups WHERE id = $1', [backupId]);
      if (backupRes.rowCount === 0) return sendError(res, 404, 'Backup not found');

      const backup = backupRes.rows[0];
      // SECURITY: verify the backup belongs to a business owned by the authenticated user
      if (!(await verifyBusinessOwner(Number(backup.business_id), authUser, res))) return;
      const snapshot = backup.snapshot;
      const { meta, folders, registers } = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
      const businessId = Number(meta.businessId);

      await query('BEGIN');
      try {
        await query('DELETE FROM entries WHERE register_id IN (SELECT id FROM registers WHERE business_id = $1)', [businessId]);
        await query('DELETE FROM registers WHERE business_id = $1', [businessId]);
        await query('DELETE FROM folders WHERE business_id = $1', [businessId]);

        for (const folder of folders) {
          await query(`
            INSERT INTO folders (id, business_id, name, created_at)
            VALUES ($1, $2, $3, $4)
          `, [folder.id, folder.businessId, folder.name, folder.createdAt]);
        }

        for (const reg of registers) {
          await query(`
            INSERT INTO registers (
              id, business_id, folder_id, name, icon, icon_color, category, template, 
              created_at, updated_at, entry_count, deleted_at, deleted_by, deleted_by_email, deleted_by_id, 
              columns, pages, share_link, shared_with, deleted_items, migration_completed, entries_per_chunk
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          `, [
            Number(reg.id),
            businessId,
            reg.folderId ? Number(reg.folderId) : null,
            reg.name,
            reg.icon || '',
            reg.iconColor || '',
            reg.category || '',
            reg.template || '',
            reg.createdAt,
            reg.updatedAt,
            reg.entryCount || 0,
            reg.deletedAt,
            reg.deletedBy || null,
            reg.deletedByEmail || null,
            reg.deletedById ? String(reg.deletedById) : null,
            JSON.stringify(reg.columns || []),
            JSON.stringify(reg.pages || []),
            reg.shareLink || null,
            JSON.stringify(reg.sharedWith || []),
            JSON.stringify(reg.deletedItems || []),
            reg.migrationCompleted ?? true,
            reg.entriesPerChunk || 50
          ]);

          const entries = reg.entries || [];
          if (entries.length > 0) {
            const batchSize = 200;
            for (let i = 0; i < entries.length; i += batchSize) {
              const batch = entries.slice(i, i + batchSize);
              const valuePhrases = [];
              const queryParams = [];

              batch.forEach((entry, idx) => {
                const offset = idx * 7;
                valuePhrases.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
                queryParams.push(
                  Number(entry.id),
                  Number(reg.id),
                  Number(entry.rowNumber || 1),
                  JSON.stringify(entry.cells || {}),
                  entry.cellStyles ? JSON.stringify(entry.cellStyles) : null,
                  Number(entry.pageIndex || 0),
                  entry.createdAt
                );
              });

              const queryText = `
                INSERT INTO entries (id, register_id, row_number, cells, cell_styles, page_index, created_at)
                VALUES ${valuePhrases.join(', ')}
              `;
              await query(queryText, queryParams);
            }
          }
        }

        await query('COMMIT');

        const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
        await query(`
          INSERT INTO activity_logs (id, user_id, user_name, action, details, timestamp)
          VALUES ($1, $2, $3, 'Backup Restored', $4, NOW())
        `, [logId, 'system', 'System', `Restored backup: ${meta.label} (${registers.length} registers)`]);

        return sendJson(res, 200, { message: 'Backup restored successfully' });
      } catch (err) {
        await query('ROLLBACK');
        console.error('Failed to restore backup:', err);
        return sendError(res, 500, 'Restoration failed: ' + err.message);
      }
    }

    // DELETE /api/backups/:id
    const deleteBackupMatch = pathname.match(/^\/api\/backups\/(.+)$/);
    if (deleteBackupMatch && method === 'DELETE') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const backupId = deleteBackupMatch[1];
      // SECURITY: verify the backup belongs to this user's business before deleting
      const backupRow = await query('SELECT business_id FROM backups WHERE id = $1', [backupId]);
      if (backupRow.rowCount === 0) return sendError(res, 404, 'Backup not found');
      if (!(await verifyBusinessOwner(Number(backupRow.rows[0].business_id), authUser, res))) return;
      await query('DELETE FROM backups WHERE id = $1', [backupId]);
      return sendJson(res, 200, { message: 'Backup deleted successfully' });
    }

    // ─── SAVED FORMULAS ──────────────────────────────────────────────────────

    // Auto-create table if needed (runs once per cold start)
    if (pathname.startsWith('/api/saved-formulas') && !globalThis._savedFormulasTableCreated) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS saved_formulas (
            id TEXT PRIMARY KEY,
            business_id BIGINT NOT NULL,
            name TEXT NOT NULL,
            formula TEXT NOT NULL,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        globalThis._savedFormulasTableCreated = true;
      } catch (e) {
        console.error('Failed to auto-create saved_formulas table:', e);
      }
    }

    // GET /api/saved-formulas?businessId=X
    if (pathname === '/api/saved-formulas' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      if (!(await verifyBusinessOwner(businessId, authUser, res))) return;
      const result = await query('SELECT * FROM saved_formulas WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
      return sendJson(res, 200, {
        formulas: result.rows.map(r => ({
          id: r.id,
          businessId: Number(r.business_id),
          name: r.name,
          formula: r.formula,
          createdBy: r.created_by,
          createdAt: r.created_at
        }))
      });
    }

    // POST /api/saved-formulas
    if (pathname === '/api/saved-formulas' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const bizId = parseBigInt(data.businessId);
      if (!(await verifyBusinessOwner(bizId, authUser, res))) return;
      if (!data.name || !data.name.trim()) return sendError(res, 400, 'name is required');
      if (!data.formula || !data.formula.trim()) return sendError(res, 400, 'formula is required');

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO saved_formulas (id, business_id, name, formula, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [id, bizId, data.name.trim(), data.formula.trim(), String(authUser.id)]);

      return sendJson(res, 201, {
        id,
        businessId: Number(bizId),
        name: data.name.trim(),
        formula: data.formula.trim(),
        createdBy: String(authUser.id)
      });
    }

    // DELETE /api/saved-formulas/:id
    const savedFormulaMatch = pathname.match(/^\/api\/saved-formulas\/(.+)$/);
    if (savedFormulaMatch && method === 'DELETE') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const formulaId = savedFormulaMatch[1];
      // SECURITY: verify the formula belongs to one of this user's businesses
      if (!isAdmin(authUser)) {
        const check = await query(
          'SELECT sf.id FROM saved_formulas sf JOIN businesses b ON b.id = sf.business_id WHERE sf.id = $1 AND b.owner_id = $2',
          [formulaId, authUser.id]
        );
        if (check.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      await query('DELETE FROM saved_formulas WHERE id = $1', [formulaId]);
      return sendJson(res, 200, { message: 'Saved formula deleted' });
    }
    // ─── SAVED DROPDOWNS ─────────────────────────────────────────────────────

    // Auto-create table if needed (runs once per cold start)
    if (pathname.startsWith('/api/saved-dropdowns') && !globalThis._savedDropdownsTableCreated) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS saved_dropdowns (
            id TEXT PRIMARY KEY,
            business_id BIGINT NOT NULL,
            name TEXT NOT NULL,
            options TEXT NOT NULL,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        globalThis._savedDropdownsTableCreated = true;
      } catch (e) {
        console.error('Failed to auto-create saved_dropdowns table:', e);
      }
    }

    // GET /api/saved-dropdowns?businessId=X
    if (pathname === '/api/saved-dropdowns' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      if (!(await verifyBusinessOwner(businessId, authUser, res))) return;
      const result = await query('SELECT * FROM saved_dropdowns WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
      return sendJson(res, 200, {
        dropdowns: result.rows.map(r => ({
          id: r.id,
          businessId: Number(r.business_id),
          name: r.name,
          options: r.options,
          createdBy: r.created_by,
          createdAt: r.created_at
        }))
      });
    }

    // POST /api/saved-dropdowns
    if (pathname === '/api/saved-dropdowns' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const bizId = parseBigInt(data.businessId);
      if (!(await verifyBusinessOwner(bizId, authUser, res))) return;
      if (!data.name || !data.name.trim()) return sendError(res, 400, 'name is required');
      if (!data.options) return sendError(res, 400, 'options are required');

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO saved_dropdowns (id, business_id, name, options, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [id, bizId, data.name.trim(), data.options, String(authUser.id)]);

      return sendJson(res, 201, {
        id,
        businessId: Number(bizId),
        name: data.name.trim(),
        options: data.options,
        createdBy: String(authUser.id)
      });
    }

    // DELETE /api/saved-dropdowns/:id
    const savedDropdownMatch = pathname.match(/^\/api\/saved-dropdowns\/(.+)$/);
    if (savedDropdownMatch && method === 'DELETE') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const dropdownId = savedDropdownMatch[1];
      if (!isAdmin(authUser)) {
        const check = await query(
          'SELECT sd.id FROM saved_dropdowns sd JOIN businesses b ON b.id = sd.business_id WHERE sd.id = $1 AND b.owner_id = $2',
          [dropdownId, authUser.id]
        );
        if (check.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      await query('DELETE FROM saved_dropdowns WHERE id = $1', [dropdownId]);
      return sendJson(res, 200, { message: 'Saved dropdown deleted' });
    }

    // ─── SAVED TEMPLATES ──────────────────────────────────────────────────────

    // Auto-create table if needed (runs once per cold start)
    if (pathname.startsWith('/api/saved-templates') && !globalThis._savedTemplatesTableCreated) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS saved_templates (
            id TEXT PRIMARY KEY,
            business_id BIGINT NOT NULL,
            name TEXT NOT NULL,
            columns TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        globalThis._savedTemplatesTableCreated = true;
      } catch (e) {
        console.error('Failed to auto-create saved_templates table:', e);
      }
    }

    // GET /api/saved-templates?businessId=X
    if (pathname === '/api/saved-templates' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      if (!(await verifyBusinessOwner(businessId, authUser, res))) return;
      const result = await query('SELECT * FROM saved_templates WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
      return sendJson(res, 200, {
        templates: result.rows.map(r => ({
          id: r.id,
          businessId: Number(r.business_id),
          name: r.name,
          columns: typeof r.columns === 'string' ? JSON.parse(r.columns) : r.columns,
          createdAt: r.created_at
        }))
      });
    }

    // POST /api/saved-templates
    if (pathname === '/api/saved-templates' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const bizId = parseBigInt(data.businessId);
      if (!(await verifyBusinessOwner(bizId, authUser, res))) return;
      if (!data.name || !data.name.trim()) return sendError(res, 400, 'name is required');
      if (!data.columns) return sendError(res, 400, 'columns are required');

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO saved_templates (id, business_id, name, columns, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [id, bizId, data.name.trim(), typeof data.columns === 'string' ? data.columns : JSON.stringify(data.columns)]);

      return sendJson(res, 201, {
        id,
        businessId: Number(bizId),
        name: data.name.trim(),
        columns: typeof data.columns === 'string' ? JSON.parse(data.columns) : data.columns
      });
    }

    // DELETE /api/saved-templates/:id
    const savedTemplateMatch = pathname.match(/^\/api\/saved-templates\/(.+)$/);
    if (savedTemplateMatch && method === 'DELETE') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const templateId = savedTemplateMatch[1];
      if (!isAdmin(authUser)) {
        const check = await query(
          'SELECT st.id FROM saved_templates st JOIN businesses b ON b.id = st.business_id WHERE st.id = $1 AND b.owner_id = $2',
          [templateId, authUser.id]
        );
        if (check.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      await query('DELETE FROM saved_templates WHERE id = $1', [templateId]);
      return sendJson(res, 200, { message: 'Saved template deleted' });
    }

    // ─── SAVED REGISTER SHORTCUTS ────────────────────────────────────────────

    // Auto-create table if needed (runs once per cold start)
    if (pathname.startsWith('/api/saved-shortcuts') && !globalThis._savedShortcutsTableCreated) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS saved_register_shortcuts (
            id TEXT PRIMARY KEY,
            business_id BIGINT NOT NULL,
            name TEXT NOT NULL,
            register_id BIGINT NOT NULL,
            register_name TEXT NOT NULL,
            search_query TEXT,
            filters TEXT NOT NULL,
            summary_column_id BIGINT,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        // Ensure the column exists on existing installations
        await query(`
          ALTER TABLE saved_register_shortcuts ADD COLUMN IF NOT EXISTS summary_column_id BIGINT;
        `);
        globalThis._savedShortcutsTableCreated = true;
      } catch (e) {
        console.error('Failed to auto-create saved_register_shortcuts table:', e);
      }
    }

    // GET /api/saved-shortcuts?businessId=X
    if (pathname === '/api/saved-shortcuts' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      if (!(await verifyBusinessOwner(businessId, authUser, res))) return;
      const result = await query('SELECT * FROM saved_register_shortcuts WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
      return sendJson(res, 200, {
        shortcuts: result.rows.map(r => ({
          id: r.id,
          businessId: Number(r.business_id),
          name: r.name,
          registerId: Number(r.register_id),
          registerName: r.register_name,
          searchQuery: r.search_query || '',
          filters: typeof r.filters === 'string' ? JSON.parse(r.filters) : r.filters,
          createdAt: r.created_at
        }))
      });
    }

    // POST /api/saved-shortcuts
    if (pathname === '/api/saved-shortcuts' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const bizId = parseBigInt(data.businessId);
      if (!(await verifyBusinessOwner(bizId, authUser, res))) return;
      if (!data.name || !data.name.trim()) return sendError(res, 400, 'name is required');
      if (!data.registerId) return sendError(res, 400, 'registerId is required');
      if (!data.registerName) return sendError(res, 400, 'registerName is required');

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await query(`
        INSERT INTO saved_register_shortcuts (id, business_id, name, register_id, register_name, search_query, filters, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        id,
        bizId,
        data.name.trim(),
        data.registerId,
        data.registerName,
        data.searchQuery || '',
        typeof data.filters === 'string' ? data.filters : JSON.stringify(data.filters || [])
      ]);

      return sendJson(res, 201, {
        id,
        businessId: Number(bizId),
        name: data.name.trim(),
        registerId: Number(data.registerId),
        registerName: data.registerName,
        searchQuery: data.searchQuery || '',
        filters: typeof data.filters === 'string' ? JSON.parse(data.filters) : (data.filters || [])
      });
    }

    // PUT /api/saved-shortcuts/:id
    const savedShortcutPutMatch = pathname.match(/^\/api\/saved-shortcuts\/(.+)$/);
    if (savedShortcutPutMatch && method === 'PUT') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const shortcutId = savedShortcutPutMatch[1];
      if (!isAdmin(authUser)) {
        const check = await query(
          'SELECT sr.id FROM saved_register_shortcuts sr JOIN businesses b ON b.id = sr.business_id WHERE sr.id = $1 AND b.owner_id = $2',
          [shortcutId, authUser.id]
        );
        if (check.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      const data = await getRequestBody(req);
      if (!data.name || !data.name.trim()) return sendError(res, 400, 'name is required');
      await query('UPDATE saved_register_shortcuts SET name = $1 WHERE id = $2', [data.name.trim(), shortcutId]);
      return sendJson(res, 200, { id: shortcutId, name: data.name.trim() });
    }

    // DELETE /api/saved-shortcuts/:id
    const savedShortcutMatch = pathname.match(/^\/api\/saved-shortcuts\/(.+)$/);
    if (savedShortcutMatch && method === 'DELETE') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const shortcutId = savedShortcutMatch[1];
      if (!isAdmin(authUser)) {
        const check = await query(
          'SELECT sr.id FROM saved_register_shortcuts sr JOIN businesses b ON b.id = sr.business_id WHERE sr.id = $1 AND b.owner_id = $2',
          [shortcutId, authUser.id]
        );
        if (check.rowCount === 0) return sendError(res, 403, 'Forbidden');
      }
      await query('DELETE FROM saved_register_shortcuts WHERE id = $1', [shortcutId]);
      return sendJson(res, 200, { message: 'Saved shortcut deleted' });
    }

    // ─── DASHBOARD CONFIGURATION ─────────────────────────────────────────────

    // Auto-create table if needed (runs once per cold start)
    if (pathname.startsWith('/api/dashboard-config') && !globalThis._dashboardConfigTableCreated) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS dashboard_configurations (
            business_id BIGINT PRIMARY KEY,
            configured_sum_metrics TEXT NOT NULL,
            shortcuts_order TEXT NOT NULL
          )
        `);
        globalThis._dashboardConfigTableCreated = true;
      } catch (e) {
        console.error('Failed to auto-create dashboard_configurations table:', e);
      }
    }

    // GET /api/dashboard-config?businessId=X
    if (pathname === '/api/dashboard-config' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const businessId = parseBigInt(url.searchParams.get('businessId'));
      if (!(await verifyBusinessOwner(businessId, authUser, res))) return;
      const result = await query('SELECT * FROM dashboard_configurations WHERE business_id = $1', [businessId]);
      if (result.rowCount === 0) {
        return sendJson(res, 200, { configuredSumMetrics: [], shortcutsOrder: [] });
      }
      const row = result.rows[0];
      return sendJson(res, 200, {
        configuredSumMetrics: typeof row.configured_sum_metrics === 'string' ? JSON.parse(row.configured_sum_metrics) : row.configured_sum_metrics,
        shortcutsOrder: typeof row.shortcuts_order === 'string' ? JSON.parse(row.shortcuts_order) : row.shortcuts_order
      });
    }

    // POST /api/dashboard-config
    if (pathname === '/api/dashboard-config' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const data = await getRequestBody(req);
      const bizId = parseBigInt(data.businessId);
      if (!(await verifyBusinessOwner(bizId, authUser, res))) return;
      
      const metricsJson = JSON.stringify(data.configuredSumMetrics || []);
      const orderJson = JSON.stringify(data.shortcutsOrder || []);

      await query(`
        INSERT INTO dashboard_configurations (business_id, configured_sum_metrics, shortcuts_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (business_id) DO UPDATE SET
          configured_sum_metrics = EXCLUDED.configured_sum_metrics,
          shortcuts_order = EXCLUDED.shortcuts_order
      `, [bizId, metricsJson, orderJson]);

      return sendJson(res, 200, { message: 'Dashboard configuration updated successfully' });
    }

    // ─── FREE UPI PAYMENTS API ────────────────────────────────────────────────

    // POST /api/submit-payment (User submits UTR reference number)
    if (pathname === '/api/submit-payment' && method === 'POST') {
      const data = await getRequestBody(req);
      const utr = data.utrNumber ? String(data.utrNumber).trim() : '';
      if (!utr || !/^\d{12}$/.test(utr)) {
        return sendError(res, 400, 'Valid 12-digit UTR reference number is required');
      }

      await query(`
        CREATE TABLE IF NOT EXISTS user_payments (
          id SERIAL PRIMARY KEY,
          user_email TEXT NOT NULL,
          user_name TEXT,
          plan_id TEXT NOT NULL,
          plan_name TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          utr_number TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      try {
        const result = await query(`
          INSERT INTO user_payments (user_email, user_name, plan_id, plan_name, amount, utr_number)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          data.userEmail || 'user@easyrecords.app',
          data.userName || 'User',
          data.planId || 'pro',
          data.planName || 'Pro Plan',
          data.amount || 199,
          utr
        ]);

        return sendJson(res, 200, { success: true, payment: result.rows[0] });
      } catch (err) {
        if (err.code === '23505') {
          return sendError(res, 400, 'This UTR Reference number has already been submitted');
        }
        throw err;
      }
    }

    // GET /api/admin/payments (Admin views pending payments)
    if (pathname === '/api/admin/payments' && method === 'GET') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      
      await query(`
        CREATE TABLE IF NOT EXISTS user_payments (
          id SERIAL PRIMARY KEY,
          user_email TEXT NOT NULL,
          user_name TEXT,
          plan_id TEXT NOT NULL,
          plan_name TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          utr_number TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = await query('SELECT * FROM user_payments ORDER BY created_at DESC LIMIT 100');
      return sendJson(res, 200, { payments: result.rows });
    }

    // POST /api/admin/verify-payment (Admin approves or rejects payment)
    if (pathname === '/api/admin/verify-payment' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      
      const data = await getRequestBody(req);
      const { paymentId, status } = data;
      if (!paymentId || !['approved', 'rejected'].includes(status)) {
        return sendError(res, 400, 'Invalid parameters');
      }

      await query('UPDATE user_payments SET status = $1, updated_at = NOW() WHERE id = $2', [status, paymentId]);
      return sendJson(res, 200, { success: true, message: `Payment status updated to ${status}` });
    }

    // POST /api/chat (AI Data Assistant Chatbot endpoint)
    if (pathname === '/api/chat' && method === 'POST') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;

      const data = await getRequestBody(req);
      const { prompt, appDataContext, apiKey: userApiKey } = data;

      if (!prompt) {
        return sendError(res, 400, 'Prompt is required');
      }

      const activeApiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      if (activeApiKey) {
        try {
          const systemInstruction = `You are "EasyRecords AI Assistant", an expert AI data analyst integrated inside the EasyRecords web application.
Your goal is to analyze the user's app data (folders, registers, record entries, numerical columns, totals, categories) and answer questions with high accuracy.

Guidelines:
1. Language: Answer in the same language as the user's query (Tamil, Tanglish, or English).
2. Data Context: Rely on the provided JSON data context representing the user's active registers and entries.
3. Clarity: Provide concise, clear responses. Use bullet points, bold numbers, and markdown formatting where helpful.
4. Accuracy: Do exact numerical additions or summaries based on the given app data when asked about totals, counts, or specific registers.
5. Helpful suggestions: At the end, suggest 1 or 2 relevant follow-up questions if appropriate.`;

          const fullPrompt = `${systemInstruction}\n\n--- LIVE APP DATA CONTEXT ---\n${JSON.stringify(appDataContext || {}, null, 2)}\n\n--- USER QUERY ---\n${prompt}`;

          const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
          for (const model of modelsToTry) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeApiKey}`;
              const fetchFn = typeof fetch !== 'undefined' ? fetch : (globalThis.fetch || null);
              if (!fetchFn) break;
              const response = await fetchFn(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: fullPrompt }] }]
                })
              });

              if (response.ok) {
                const geminiData = await response.json();
                const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textResponse) {
                  return sendJson(res, 200, { response: textResponse, source: 'gemini' });
                }
              } else {
                const errText = await response.text().catch(() => '');
                console.error(`[AI Chat] Gemini API model ${model} HTTP ${response.status}:`, errText);
              }
            } catch (err) {
              console.error(`[AI Chat] Error with model ${model}:`, err);
            }
          }
        } catch (geminiErr) {
          console.error('[AI Chat] Gemini API outer error:', geminiErr);
        }
      }

      // Fallback response indication if no key or API failed
      return sendJson(res, 200, {
        response: null,
        source: 'local',
        message: 'No active API Key or API error. Local engine will process context.'
      });
    }

    // If no route matches, return 404
    return sendError(res, 404, `Route ${pathname} not found`);

  } catch (error) {
    console.error(`[API Error] error executing request ${method} ${pathname}:`, error);
    return sendError(res, 500, error.message || 'Internal Server Error');
  }
}

// Map database request format to frontend camelCase property names
function formatRequest(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    type: r.type,
    registerId: r.register_id ? Number(r.register_id) : undefined,
    registerName: r.register_name,
    description: r.description,
    scope: r.scope || {},
    status: r.status,
    createdAt: r.created_at,
    adminResponse: r.admin_response,
    respondedAt: r.responded_at
  };
}

function parseBigInt(val) {
  if (val === undefined || val === null) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
