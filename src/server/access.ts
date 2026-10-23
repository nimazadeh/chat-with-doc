import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Configuration } from './configuration.js';

const cookieName = 'learning_session';

/** In-memory sessions intentionally expire on restart; no credentials need to be persisted. */
export class WorkspaceAccess {
  private readonly sessions = new Map<string, number>();
  private readonly expectedCodeHash: Buffer;
  private failedAttempts = 0;
  private attemptWindowEndsAt = 0;

  constructor(private readonly configuration: Configuration) {
    this.expectedCodeHash = this.hash(configuration.accessCode);
  }

  private hash(value: string): Buffer {
    return createHash('sha256').update(value).digest();
  }

  retryAfterSeconds(): number {
    if (Date.now() >= this.attemptWindowEndsAt) {
      this.failedAttempts = 0;
      this.attemptWindowEndsAt = Date.now() + 10 * 60 * 1000;
    }
    return this.failedAttempts >= 5
      ? Math.ceil((this.attemptWindowEndsAt - Date.now()) / 1000)
      : 0;
  }

  verifyCode(code: string): boolean {
    const matches = timingSafeEqual(this.hash(code), this.expectedCodeHash);
    if (matches) {
      this.failedAttempts = 0;
    } else {
      this.failedAttempts += 1;
    }
    return matches;
  }

  private sessionToken(cookie: string | undefined): string | undefined {
    return cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
  }

  isAuthenticated(cookie: string | undefined): boolean {
    const token = this.sessionToken(cookie);
    if (!token) {
      return false;
    }
    const expiresAt = this.sessions.get(token);
    if (expiresAt === undefined) {
      return false;
    }
    if (expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  openSession(previousCookie: string | undefined): string {
    this.closeSession(previousCookie);
    for (const [token, expiration] of this.sessions) {
      if (expiration <= Date.now()) {
        this.sessions.delete(token);
      }
    }
    // A single-owner workspace should not accumulate unbounded active tokens.
    if (this.sessions.size >= 32) {
      const oldest = this.sessions.keys().next().value;
      if (oldest) {
        this.sessions.delete(oldest);
      }
    }
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, Date.now() + this.configuration.sessionLifetimeMs);
    return this.cookie(
      token,
      Math.floor(this.configuration.sessionLifetimeMs / 1000),
    );
  }

  closeSession(cookie: string | undefined): string {
    const token = this.sessionToken(cookie);
    if (token) {
      this.sessions.delete(token);
    }
    return this.cookie('', 0);
  }

  private cookie(token: string, maxAge: number): string {
    const secure = this.configuration.secureCookies ? '; Secure' : '';
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
  }
}
