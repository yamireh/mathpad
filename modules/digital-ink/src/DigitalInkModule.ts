import { NativeModule, requireNativeModule } from 'expo';

import {
  DigitalInkModuleEvents,
  RecognitionCandidate,
  Stroke,
} from './DigitalInk.types';

declare class DigitalInkModule extends NativeModule<DigitalInkModuleEvents> {
  isModelDownloaded(language: string): Promise<boolean>;
  downloadModel(language: string): Promise<void>;
  recognize(language: string, strokes: Stroke[]): Promise<RecognitionCandidate[]>;
}

export default requireNativeModule<DigitalInkModule>('DigitalInk');
