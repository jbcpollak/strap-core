// Supplied by Express Session middleware
export interface SessionCookieData {
	originalMaxAge: number;
	path: string;
	maxAge: number | null;
	secure?: boolean;
	httpOnly: boolean;
	domain?: string;
	expires: Date | boolean;
}

/**
 * Session data passed between routes on a per-user basis
 */
export interface ISession {
	cookie: SessionCookieData;

	// Path to redirect to after OAuth flow
	redirectTo?: string;

	// GitHub OAuth token
	token?: string,
}
