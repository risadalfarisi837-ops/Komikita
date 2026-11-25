export interface NetPose {
  x: number;
  y: number;
  facing?: number;
  moving?: boolean;
  step?: number;
  [key: string]: any;
}

export interface RemotePlayer {
  id: string;
  name?: string;
  x?: number;
  y?: number;
  facing?: number;
  moving?: boolean;
  step?: number;
  [key: string]: any;
}
