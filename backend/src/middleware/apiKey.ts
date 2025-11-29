import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.IMPORT_API_KEY;
  if (!configured) {
    // No key set in env: allow through (developer convenience)
    logger.warn('IMPORT_API_KEY not set; import endpoints are unprotected in this environment');
    return next();
  }

  const header = String(req.headers['x-api-key'] ?? '');
  if (!header || header !== configured) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}
