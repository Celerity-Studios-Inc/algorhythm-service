import { Module } from '@nestjs/common';
import { AlgorhythmExportSimpleController } from './controllers/algorhythm-export-simple.controller';

@Module({
  controllers: [AlgorhythmExportSimpleController],
  providers: [],
  exports: [],
})
export class AlgorhythmModule {}
