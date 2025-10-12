import { Module } from '@nestjs/common';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { CachingModule } from '../caching/caching.module';

@Module({
  imports: [CachingModule],
  providers: [PerformanceMonitoringService],
  exports: [PerformanceMonitoringService],
})
export class MonitoringModule {}
