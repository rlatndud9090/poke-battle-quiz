import { getCandidate } from "../data";
import type { Candidate } from "../data";
import metadataSource from "./panel-metadata.json";
import type { PanelMetadata } from "./types";

const metadataEntries = metadataSource as PanelMetadata[];

const metadataById = new Map<string, PanelMetadata>();
for (const entry of metadataEntries) {
  metadataById.set(entry.candidateId, entry);
}

const eligibleCandidatesCache: Candidate[] = [];
for (const entry of metadataEntries) {
  if (!entry.eligible) continue;
  const candidate = getCandidate(entry.candidateId);
  if (!candidate) {
    throw new Error(`Missing candidate for panel metadata: ${entry.candidateId}`);
  }
  eligibleCandidatesCache.push(candidate);
}

export const panelMetadata = metadataEntries;
export const eligibleCandidates = eligibleCandidatesCache;

export function getPanelMetadata(candidateId: string): PanelMetadata {
  const entry = metadataById.get(candidateId);
  if (!entry) {
    throw new Error(`Missing panel metadata for candidate: ${candidateId}`);
  }
  return entry;
}
