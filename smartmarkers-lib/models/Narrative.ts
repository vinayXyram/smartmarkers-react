export interface Narrative extends Element {
  status: NarrativeStatus;
  div: string;
}
export declare enum NarrativeStatus {
  Generated = "generated",
  Extensions = "extensions",
  Additional = "additional",
  Empty = "empty",
}
