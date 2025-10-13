import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as zlib from 'zlib';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send;
    
    // Check if client accepts gzip
    const acceptsGzip = req.headers['accept-encoding']?.includes('gzip');
    
    if (acceptsGzip && this.shouldCompress(req)) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      
      res.send = function(data: any) {
        if (typeof data === 'string') {
          const compressed = zlib.gzipSync(data);
          res.setHeader('Content-Length', compressed.length.toString());
          return originalSend.call(this, compressed);
        }
        return originalSend.call(this, data);
      };
    }
    
    next();
  }
  
  private shouldCompress(req: Request): boolean {
    const path = req.path;
    
    // Compress API responses but not health checks
    return path.startsWith('/api/') && 
           !path.includes('/health') && 
           !path.includes('/metrics');
  }
}
