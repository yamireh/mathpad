export type StrokePoint = readonly [x: number, y: number, t: number];

export type Stroke = readonly StrokePoint[];

export type RecognitionCandidate = {
  text: string;
  score: number | null;
};

export type DigitalInkModuleEvents = {};
