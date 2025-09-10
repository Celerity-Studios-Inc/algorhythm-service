import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEvent, AnalyticsEventSchema } from '../../models/analytics-event.schema';
import { UserPreference, UserPreferenceSchema } from '../../models/user-preference.schema';
import { CachingModule } from '../caching/caching.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AnalyticsEvent', schema: AnalyticsEventSchema },
      { name: 'UserPreference', schema: UserPreferenceSchema },
    ]),
    CachingModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
