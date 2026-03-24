export interface BoundingBox {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  width: number; // Normalized 0-1
  height: number; // Normalized 0-1
  classId: number;
}

export interface Annotation {
  id: string;
  box: BoundingBox;
}

export interface ImageFile {
  id: string;
  name: string;
  url: string;
  annotations: Annotation[];
  width: number;
  height: number;
  sourceVideoId?: string;
  frameNumber?: number;
}

export interface VideoFile {
  id: string;
  name: string;
  url: string;
  duration: number;
  width: number;
  height: number;
}

export interface ClassDefinition {
  id: number;
  name: string;
  color: string;
}
