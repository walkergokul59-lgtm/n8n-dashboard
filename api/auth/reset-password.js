import bcrypt from 'bcryptjs';
import { verifyResetToken } from '../_lib/resetCodes.js';
import { readRbacConfig, writeRbacConfig } from '../../server/rbacStore.js';
import { findUserByEmail } from '../../server/accessControl.js';
import { createAuditLog, isGoogleSheetsConfigured } from '../../server/googleSheetsStore.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const resetToken = String(req?.body?.resetToken || '').trim();
    const newPassword = String(req?.body?.newPassword || '');

    if (!resetToken) {
      res.status(400).json({ error: 'Reset token is required' });
      return;
    }

    const tokenData = verifyResetToken(resetToken);
    if (!tokenData) {
      res.status(400).json({ error: 'Invalid or expired reset token. Please start over.' });
      return;
    }

    if (newPassword.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters long' });
      return;
    }

    const config = await readRbacConfig();
    const user = findUserByEmail(config, tokenData.email);
    if (!user) {
      res.status(400).json({ error: 'User account not found' });
      return;
    }

    // Hash and update user password in the RBAC store
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const users = (config.users || []).map((u) =>
      String(u.id) === String(user.id) ? { ...u, password: hashedPassword } : u
    );

    await writeRbacConfig({ ...config, users });

    if (isGoogleSheetsConfigured()) {
      createAuditLog({ userId: user.id, action: 'password_reset', meta: { email: tokenData.email } });
    }

    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
}
