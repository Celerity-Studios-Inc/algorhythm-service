import { Controller, All, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Controller('algorhythm')
export class LegacyRedirectController {
  private readonly logger = new Logger(LegacyRedirectController.name);

  @All('*')
  handleLegacyRoute(@Req() req: Request, @Res() res: Response) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const canonicalPath = req.path.replace('/api/v1/algorhythm', '/api/v1');
    const canonicalUrl = `${req.protocol}://${req.get('host')}${canonicalPath}`;

    this.logger.warn({
      message: 'Legacy endpoint accessed - returning 410 Gone',
      event: 'legacy_endpoint_410',
      deprecated_path: req.path,
      canonical_path: canonicalPath,
      canonical_url: canonicalUrl,
      request_id: requestId,
      method: req.method,
      user_agent: req.headers['user-agent'],
      ip_address: (req.headers['x-forwarded-for'] as string) || req.ip,
      timestamp: new Date().toISOString(),
      query_params: req.query,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
      },
      body_present: !!req.body && Object.keys(req.body as Record<string, unknown>).length > 0,
    });

    return res
      .status(HttpStatus.GONE)
      .header('Location', canonicalUrl)
      .header('X-Request-ID', requestId)
      .header('X-Deprecated-Path', req.path)
      .header('X-Canonical-Path', canonicalPath)
      .header('Sunset', new Date().toUTCString())
      .json({
        error: 'Gone',
        statusCode: 410,
        message: 'This endpoint has been removed. Please use the canonical path.',
        deprecated_path: req.path,
        canonical_path: canonicalPath,
        canonical_url: canonicalUrl,
        request_id: requestId,
        documentation: 'https://dev.algorhythm.media/api/docs',
        migration_guide: 'https://docs.algorhythm.media/migration/endpoint-consolidation',
        removed_at: new Date().toISOString(),
        reason: 'Endpoint path standardization - immediate cutover',
      });
  }
}


