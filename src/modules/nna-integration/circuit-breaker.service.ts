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
    const circuitState = this.isCircuitOpen();
    
    if (circuitState) {
      const status = this.getStatus();
      this.logger.warn(`🔴 Circuit breaker OPEN for ${operationName}, using fallback`);
      this.logger.warn(`📊 [CIRCUIT BREAKER] Failure count: ${status.failureCount}, Time since last failure: ${status.timeSinceLastFailure}ms`);
      return fallback();
    }

    try {
      this.logger.log(`🟢 Executing ${operationName} with circuit breaker (CLOSED state, failures: ${this.failureCount}/${this.failureThreshold})`);
      
      const result = await operation();
      
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.logger.error(`❌ ${operationName} threw error during execution`);
      this.lastError = error; // Store error for debugging
      this.onFailure(operationName, error);
      this.logger.warn(`⚠️ ${operationName} failed, using fallback`);
      
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
    
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      status: error.response?.status || error.status || 'unknown',
      statusText: error.response?.statusText || error.statusText || 'unknown',
      responseData: error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'none',
      code: error.code || 'unknown',
      stack: error.stack ? error.stack.substring(0, 300) : 'none'
    };
    
    this.logger.error(`❌ ${operationName} failed (${this.failureCount}/${this.failureThreshold})`);
    this.logger.error(`📊 [ERROR DETAILS] Status: ${errorDetails.status}, Code: ${errorDetails.code}`);
    this.logger.error(`📊 [ERROR DETAILS] Message: ${errorDetails.message}`);
    this.logger.error(`📊 [ERROR DETAILS] Response: ${errorDetails.responseData}`);
    
    if (this.failureCount >= this.failureThreshold) {
      this.logger.error(`🔴 Circuit breaker OPEN for ${operationName} after ${this.failureCount} failures`);
      this.logger.error(`📊 [CIRCUIT BREAKER] Will auto-close after ${this.resetTimeout}ms`);
    }
  }

  getStatus() {
    return {
      failureCount: this.failureCount,
      isOpen: this.isCircuitOpen(),
      timeSinceLastFailure: Date.now() - this.lastFailureTime,
      resetTimeout: this.resetTimeout,
      lastError: this.lastError || null
    };
  }

  private lastError: any = null;

  /**
   * Get last error details for debugging
   */
  getLastError() {
    return this.lastError ? {
      message: this.lastError.message,
      status: this.lastError.response?.status || this.lastError.status || null,
      code: this.lastError.code || null,
      responseData: this.lastError.response?.data || null
    } : null;
  }

  /**
   * 🔧 CRITICAL FIX: Manual circuit breaker reset for immediate recovery
   */
  resetCircuitBreaker(): void {
    this.logger.log(`🔄 [CIRCUIT BREAKER] Manual reset requested`);
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.lastError = null; // Clear last error on reset
    this.logger.log(`✅ [CIRCUIT BREAKER] Circuit breaker reset successfully`);
  }
}
