import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    console.error('⚠️ [API KEY] VALIDATION DISABLED FOR TESTING');
    console.error('⚠️ [API KEY] This is a temporary bypass to test service integration');
    console.error('⚠️ [API KEY] Re-enable authentication after testing is complete');
    return true;  // Allow all requests temporarily
  }
}