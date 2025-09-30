// Extend Express Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        userId: string;
        email: string;
        role: string;
        tokenSource?: 'algorhythm' | 'nna_registry';
      };
    }
  }
}

export {};
