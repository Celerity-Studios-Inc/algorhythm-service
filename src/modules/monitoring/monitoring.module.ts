import { Module } from '@nestjs/common';
import { ApiPerformanceMonitoringService } from './performance-monitoring.service';
import { CachingModule } from '../caching/caching.module';

@Module({
  imports: [CachingModule],
  providers: [ApiPerformanceMonitoringService],
  exports: [ApiPerformanceMonitoringService],
})
export class MonitoringModule {}
