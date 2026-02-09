export type CellOwner = {
  username: string;
  color: string;
  timestamp: number;
} | null;

export type JoinPayload = {
  username: string;
  color: string;
};

export type CapturePayload = {
  cellId: number;
};
