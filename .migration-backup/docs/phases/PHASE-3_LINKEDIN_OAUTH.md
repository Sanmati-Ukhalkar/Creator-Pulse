# Phase 3 — LinkedIn OAuth & Token Management

> **Timeline:** Week 2 (Days 6–10)  
> **Depends On:** Phase 1 (Backend running with auth middleware)  
> **Unlocks:** Phase 4 (Publish Now — needs valid LinkedIn tokens)  
> **Status:** 🔲 Not Started

---

## 🎯 Phase Objective

Implement the complete LinkedIn OAuth2 flow:
- Register LinkedIn Developer App
- Build OAuth2 authorize → callback → token exchange flow
- Encrypt tokens (AES-256-GCM) before storing in `platform_connections`
- Token refresh mechanism for expired tokens
- LinkedIn profile fetch to verify connection
- Frontend "Connect LinkedIn" button + status display
- Disconnect flow to remove stored tokens

**End state:** User can connect their LinkedIn account via OAuth, and the backend stores encrypted tokens ready for publishing.

---

## 📁 Files to Create / Modify

```
backend/src/
├── controllers/
│   └── linkedin.controller.ts        # NEW — OAuth handlers
├── routes/
│   └── linkedin.routes.ts            # NEW — Route definitions
├── services/
│   └── linkedin.service.ts           # NEW — LinkedIn API wrapper
├── utils/
│   └── encrypt.ts                    # NEW — AES-256-GCM encryption
└── config/
    └── env.ts                        # MODIFY — Add LinkedIn env vars

frontend/src/
├── hooks/
│   └── useLinkedIn.ts                # NEW — LinkedIn connection hook
├── components/
│   └── settings/
│       └── LinkedInConnect.tsx        # NEW — Connect/disconnect UI
└── pages/
    └── Settings.tsx                   # MODIFY — Add LinkedIn section
```

---

## 📋 Task Breakdown

### Task 3.1 — Register LinkedIn Developer App
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min  
**Type:** Manual / External

**Steps:**
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click "Create App"
3. Fill in:
   - App name: `CreatorPulse`
   - LinkedIn Page: Your company page (create one if needed)
   - App logo: Upload CreatorPulse logo
4. Under **Auth** tab:
   - Add redirect URL: `http://localhost:4000/api/linkedin/callback`
5. Under **Products** tab:
   - Request access to **"Share on LinkedIn"** (for posting)
   - Request access to **"Sign In with LinkedIn using OpenID Connect"** (for profile)
6. Note down:
   - `Client ID`
   - `Client Secret`

**Required OAuth Scopes:**
```
openid            — OpenID Connect
profile           — Basic profile
email             — Email address
w_member_social   — Post on behalf of user
```

**Acceptance Criteria:**
- [ ] LinkedIn Developer App created and approved
- [ ] Client ID and Client Secret obtained
- [ ] Redirect URL configured: `http://localhost:4000/api/linkedin/callback`
- [ ] `w_member_social` product access granted (may take 1-3 days)

---

### Task 3.2 — Update Environment Config
**Priority:** 🔴 Critical  
**Estimated Time:** 10 min

**Modify `backend/src/config/env.ts`** to add LinkedIn variables:
```typescript
// Add to envSchema:
LINKEDIN_CLIENT_ID: z.string().min(10),
LINKEDIN_CLIENT_SECRET: z.string().min(10),
LINKEDIN_REDIRECT_URI: z.string().url().default('http://localhost:4000/api/linkedin/callback'),
```

**Update `backend/.env`:**
```bash
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:4000/api/linkedin/callback
```

**Acceptance Criteria:**
- [ ] Backend refuses to start if LinkedIn env vars are missing
- [ ] Values are properly typed and validated

---

### Task 3.3 — Token Encryption Utility (`utils/encrypt.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 40 min

**Purpose:** LinkedIn access and refresh tokens must NEVER be stored in plaintext. Use AES-256-GCM with a random IV per encryption.

**Implementation Pattern:**
```typescript
// backend/src/utils/encrypt.ts
import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM.
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine: iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Input: base64(iv + authTag + ciphertext)
 */
export function decrypt(encryptedBase64: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const combined = Buffer.from(encryptedBase64, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
```

**Generate an encryption key:**
```bash
# Run this once to generate your ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Acceptance Criteria:**
- [ ] `encrypt("hello") !== "hello"` — data is actually encrypted
- [ ] `decrypt(encrypt("hello")) === "hello"` — round-trip works
- [ ] Different calls to `encrypt("hello")` produce different ciphertexts (random IV)
- [ ] Tampering with ciphertext causes decryption to throw
- [ ] Key is read from env, never hardcoded

---

### Task 3.4 — LinkedIn Service (`services/linkedin.service.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 60 min

**Purpose:** All LinkedIn API interactions — OAuth token exchange, token refresh, profile fetch, post creation.

**Key LinkedIn API Endpoints:**
| Action | Method | URL |
|--------|--------|-----|
| Authorize | GET | `https://www.linkedin.com/oauth/v2/authorization` |
| Token Exchange | POST | `https://www.linkedin.com/oauth/v2/accessToken` |
| User Profile | GET | `https://api.linkedin.com/v2/userinfo` |
| Create Post | POST | `https://api.linkedin.com/v2/ugcPosts` |

**Implementation Pattern:**
```typescript
// backend/src/services/linkedin.service.ts
import axios from 'axios';
import { env } from '../config/env';
import { encrypt, decrypt } from '../utils/encrypt';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_UGC_URL = 'https://api.linkedin.com/v2/ugcPosts';

const SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

export const linkedinService = {
  /**
   * Generate the OAuth2 authorization URL
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.LINKEDIN_CLIENT_ID,
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      state,
      scope: SCOPES.join(' '),
    });
    return `${LINKEDIN_AUTH_URL}?${params}`;
  },

  /**
   * Exchange authorization code for access + refresh tokens
   */
  async exchangeCode(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const response = await axios.post(LINKEDIN_TOKEN_URL, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  /**
   * Refresh an expired access token
   */
  async refreshToken(encryptedRefreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const refreshToken = decrypt(encryptedRefreshToken);
    const response = await axios.post(LINKEDIN_TOKEN_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  /**
   * Fetch LinkedIn user profile
   */
  async getProfile(accessToken: string): Promise<{
    sub: string;
    name: string;
    email: string;
    picture: string;
  }> {
    const response = await axios.get(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  /**
   * Store encrypted tokens in platform_connections
   */
  async storeTokens(
    userId: string,
    profile: { sub: string; name: string; email: string },
    tokens: { access_token: string; refresh_token?: string; expires_in: number }
  ) {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform: 'linkedin',
        platform_user_id: profile.sub,
        platform_username: profile.name,
        access_token: encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        token_expires_at: expiresAt,
        is_active: true,
        last_sync_at: new Date().toISOString(),
        platform_data: { email: profile.email },
      }, {
        onConflict: 'user_id,platform',
      });

    if (error) {
      logger.error('Failed to store LinkedIn tokens', { error });
      throw new Error('Failed to store tokens');
    }
  },

  /**
   * Get a valid access token (refresh if expired)
   */
  async getValidToken(userId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('LinkedIn not connected');
    }

    // Check if token is expired (with 5-minute buffer)
    const expiresAt = new Date(data.token_expires_at);
    const now = new Date(Date.now() + 5 * 60 * 1000);

    if (now < expiresAt) {
      return decrypt(data.access_token);
    }

    // Token expired — refresh
    if (!data.refresh_token) {
      throw new Error('LinkedIn token expired. Please reconnect.');
    }

    logger.info('Refreshing expired LinkedIn token', { userId });
    const newTokens = await this.refreshToken(data.refresh_token);

    // Store new tokens
    await supabaseAdmin
      .from('platform_connections')
      .update({
        access_token: encrypt(newTokens.access_token),
        refresh_token: newTokens.refresh_token ? encrypt(newTokens.refresh_token) : data.refresh_token,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        last_sync_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('platform', 'linkedin');

    return newTokens.access_token;
  },
};
```

**Acceptance Criteria:**
- [ ] `getAuthUrl()` returns valid LinkedIn OAuth URL
- [ ] `exchangeCode()` exchanges auth code for tokens
- [ ] Tokens are encrypted before storage
- [ ] `getValidToken()` returns decrypted token when valid
- [ ] `getValidToken()` auto-refreshes expired tokens
- [ ] Failed refresh throws clear error

---

### Task 3.5 — LinkedIn Controller (`controllers/linkedin.controller.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 45 min

**Routes to implement:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/linkedin/auth-url` | JWT | Generate OAuth URL (with CSRF state) |
| `GET` | `/api/linkedin/callback` | OAuth | Handle redirect, exchange code |
| `GET` | `/api/linkedin/status` | JWT | Check if LinkedIn is connected |
| `DELETE` | `/api/linkedin/disconnect` | JWT | Remove LinkedIn connection |

**Implementation Pattern:**
```typescript
// backend/src/controllers/linkedin.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { linkedinService } from '../services/linkedin.service';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// In-memory state store (for MVP; use Redis in production)
const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

export const linkedinController = {
  async getAuthUrl(req: Request, res: Response) {
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, {
      userId: req.user!.id,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min expiry
    });

    const url = linkedinService.getAuthUrl(state);
    res.json({ url });
  },

  async callback(req: Request, res: Response) {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('LinkedIn OAuth error', { error: oauthError });
      return res.redirect('http://localhost:8080/settings?linkedin=error');
    }

    // Validate state (CSRF protection)
    const storedState = oauthStates.get(state as string);
    if (!storedState || storedState.expiresAt < Date.now()) {
      oauthStates.delete(state as string);
      return res.redirect('http://localhost:8080/settings?linkedin=invalid_state');
    }

    const userId = storedState.userId;
    oauthStates.delete(state as string);

    try {
      // Exchange code for tokens
      const tokens = await linkedinService.exchangeCode(code as string);

      // Fetch LinkedIn profile
      const profile = await linkedinService.getProfile(tokens.access_token);

      // Store encrypted tokens
      await linkedinService.storeTokens(userId, profile, tokens);

      logger.info('LinkedIn connected successfully', { userId, linkedinUser: profile.name });
      res.redirect('http://localhost:8080/settings?linkedin=success');
    } catch (err: any) {
      logger.error('LinkedIn OAuth callback failed', { error: err.message });
      res.redirect('http://localhost:8080/settings?linkedin=error');
    }
  },

  async getStatus(req: Request, res: Response) {
    const { data, error } = await supabaseAdmin
      .from('platform_connections')
      .select('platform_username, platform_user_id, is_active, last_sync_at, token_expires_at')
      .eq('user_id', req.user!.id)
      .eq('platform', 'linkedin')
      .single();

    if (error || !data) {
      return res.json({ connected: false });
    }

    res.json({
      connected: data.is_active,
      username: data.platform_username,
      lastSync: data.last_sync_at,
      tokenExpires: data.token_expires_at,
    });
  },

  async disconnect(req: Request, res: Response) {
    const { error } = await supabaseAdmin
      .from('platform_connections')
      .update({ is_active: false, access_token: null, refresh_token: null })
      .eq('user_id', req.user!.id)
      .eq('platform', 'linkedin');

    if (error) {
      logger.error('Failed to disconnect LinkedIn', { error });
      return res.status(500).json({ error: 'Failed to disconnect' });
    }

    res.json({ disconnected: true });
  },
};
```

---

### Task 3.6 — LinkedIn Routes (`routes/linkedin.routes.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 10 min

```typescript
// backend/src/routes/linkedin.routes.ts
import { Router } from 'express';
import { linkedinController } from '../controllers/linkedin.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth-url', authMiddleware, linkedinController.getAuthUrl);
router.get('/callback', linkedinController.callback);  // No auth — OAuth redirect
router.get('/status', authMiddleware, linkedinController.getStatus);
router.delete('/disconnect', authMiddleware, linkedinController.disconnect);

export default router;
```

**Wire into `server.ts`:**
```typescript
import linkedinRoutes from './routes/linkedin.routes';
app.use('/api/linkedin', linkedinRoutes);
```

---

### Task 3.7 — Frontend: LinkedIn Connection UI
**Priority:** 🟡 Important  
**Estimated Time:** 45 min

**Create `src/hooks/useLinkedIn.ts`:**
- `getStatus()` — check connection status from backend
- `connect()` — open OAuth URL in new window
- `disconnect()` — remove connection

**Create or modify `src/components/settings/LinkedInConnect.tsx`:**
- Show "Connect LinkedIn" button (gradient, branded)
- Show connected state with username and last sync time
- Show "Disconnect" button when connected
- Handle URL query params (`?linkedin=success|error`) from OAuth callback

**Modify `src/pages/Settings.tsx`:**
- Add LinkedIn connection section

**Acceptance Criteria:**
- [ ] "Connect LinkedIn" button visible on Settings page
- [ ] Clicking opens LinkedIn OAuth page
- [ ] After authorization, redirects back with connected status
- [ ] Connected state shows LinkedIn username
- [ ] Disconnect button removes connection

---

## ✅ Phase 3 Completion Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | LinkedIn Developer App registered with correct redirect URL | 🔲 |
| 2 | `GET /api/linkedin/auth-url` — returns valid LinkedIn OAuth URL | 🔲 |
| 3 | Full OAuth flow: authorize → callback → tokens stored | 🔲 |
| 4 | Tokens in `platform_connections` are encrypted (not plaintext) | 🔲 |
| 5 | `GET /api/linkedin/status` — shows connected with username | 🔲 |
| 6 | `DELETE /api/linkedin/disconnect` — removes tokens | 🔲 |
| 7 | `encrypt()`/`decrypt()` round-trip works correctly | 🔲 |
| 8 | Expired tokens trigger automatic refresh | 🔲 |
| 9 | Frontend Settings page shows LinkedIn connection UI | 🔲 |
| 10 | OAuth state parameter validates properly (CSRF protection) | 🔲 |

---

## ⚠️ Important Notes

### LinkedIn API Rate Limits
- **Developer tier:** 100 API calls/day
- **Post creation:** Limited to 25 posts/day per user
- **Token lifetime:** 60 days (access), 365 days (refresh)

### LinkedIn API Approval Delay
- The `w_member_social` product access may take **1-3 business days** to approve
- You can build and test the OAuth flow without it
- Publishing will fail until approval is granted — handle this gracefully

### Security Reminders
- NEVER log access tokens (even encrypted ones)
- NEVER return tokens in API responses
- OAuth state must be single-use and time-limited
- Encryption key must be exactly 32 bytes (64 hex chars)

---

## 📎 References

- **Architecture:** `docs/ARCHITECTURE.md` → Sections 7 (Flow 2), 9 (Security Model)
- **API Contract:** `docs/ARCHITECTURE.md` → Section 11 (LinkedIn endpoints)
- **LinkedIn API Docs:** https://learn.microsoft.com/en-us/linkedin/
- **OAuth2 Flow:** https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
