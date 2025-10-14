import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 3;
  private readonly timeout = 5000; // 5 seconds to allow NNA Registry calls to complete
  private readonly resetTimeout = 10000; // 10 seconds for faster recovery

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback: () => T,
    operationName: string = 'operation'
  ): Promise<T> {
    if (this.isCircuitOpen()) {
      this.logger.warn(`🔴 Circuit breaker OPEN for ${operationName}, using fallback`);
      return fallback();
    }

    try {
      this.logger.debug(`🟢 Executing ${operationName} with circuit breaker`);
      
      const result = await operation();
      
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.onFailure(operationName, error);
      this.logger.warn(`⚠️ ${operationName} failed, using fallback: ${error.message}`);
      return fallback();
    }
  }

  private isCircuitOpen(): boolean {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return this.failureCount >= this.failureThreshold && 
           timeSinceLastFailure < this.resetTimeout;
  }

  private onSuccess(operationName: string): void {
    if (this.failureCount > 0) {
      this.logger.log(`✅ ${operationName} succeeded, resetting circuit breaker`);
    }
    this.failureCount = 0;
  }

  private onFailure(operationName: string, error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    this.logger.warn(`❌ ${operationName} failed (${this.failureCount}/${this.failureThreshold}): ${error.message}`);
    
    if (this.failureCount >= this.failureThreshold) {
      this.logger.error(`🔴 Circuit breaker OPEN for ${operationName} after ${this.failureCount} failures`);
    }
  }

  getStatus() {
    return {
      failureCount: this.failureCount,
      isOpen: this.isCircuitOpen(),
      timeSinceLastFailure: Date.now() - this.lastFailureTime,
      resetTimeout: this.resetTimeout
    };
  }

  /**
   * 🔧 CRITICAL FIX: Manual circuit breaker reset for immediate recovery
   */
  resetCircuitBreaker(): void {
    this.logger.log(`🔄 [CIRCUIT BREAKER] Manual reset requested`);
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.logger.log(`✅ [CIRCUIT BREAKER] Circuit breaker reset successfully`);
  }
}
