import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: any;
  timestamp: Date;
  resolved?: boolean;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly alertHistory: Alert[] = [];

  constructor(private configService: ConfigService) {}

  async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    context: any = {}
  ): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      context,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Log the alert
    this.logAlert(alert);

    // Send notifications for critical alerts
    if (severity === 'critical') {
      await this.sendCriticalAlert(alert);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`✅ Alert resolved: ${alertId} - ${alert.message}`);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAlertHistory(): Alert[] {
    return this.alertHistory;
  }

  private logAlert(alert: Alert): void {
    const logMessage = `🚨 Alert [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`;
    
    switch (alert.severity) {
      case 'critical':
        this.logger.error(logMessage, alert.context);
        break;
      case 'high':
        this.logger.error(logMessage, alert.context);
        break;
      case 'medium':
        this.logger.warn(logMessage, alert.context);
        break;
      case 'low':
        this.logger.log(logMessage, alert.context);
        break;
    }
  }

  private async sendCriticalAlert(alert: Alert): Promise<void> {
    // This would integrate with external alerting systems
    // For now, we'll just log it
    this.logger.error(
      `🚨 CRITICAL ALERT: ${alert.message}`,
      {
        alertId: alert.id,
        context: alert.context,
        timestamp: alert.timestamp,
      }
    );

    // In a real implementation, this would:
    // 1. Send email notifications
    // 2. Send Slack/Discord messages
    // 3. Create PagerDuty incidents
    // 4. Send SMS notifications
  }

  // Specific alert methods for common scenarios
  async alertServiceDown(serviceName: string, error: any): Promise<void> {
    await this.createAlert(
      'error',
      'critical',
      `Service ${serviceName} is down`,
      { serviceName, error: error.message, stack: error.stack }
    );
  }

  async alertHighErrorRate(endpoint: string, errorRate: number): Promise<void> {
    await this.createAlert(
      'warning',
      'high',
      `High error rate detected for ${endpoint}: ${errorRate}%`,
      { endpoint, errorRate }
    );
  }

  async alertSlowResponse(endpoint: string, responseTime: number): Promise<void> {
    await this.createAlert(
      'warning',
      'medium',
      `Slow response time for ${endpoint}: ${responseTime}ms`,
      { endpoint, responseTime }
    );
  }

  async alertAuthenticationFailure(userId: string, reason: string): Promise<void> {
    await this.createAlert(
      'error',
      'high',
      `Authentication failure for user ${userId}: ${reason}`,
      { userId, reason }
    );
  }
}
