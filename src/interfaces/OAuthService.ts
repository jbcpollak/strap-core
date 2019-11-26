import {Response} from 'express';

export interface OAuthService {
	// performs redirection
	authenticate(res: Response): Response;
}
