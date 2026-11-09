import type { CareersSnapshot } from "./careers-104";
import real from "../data/careers-104.json" with { type: "json" };
import fixture from "../../tests/fixtures/careers-104.json" with { type: "json" };
import { contentSource } from "./content-source";

/** The committed 104 snapshot; fixture builds use a synthetic one so the job cards are tested. */
export function careers(): CareersSnapshot {
  return (contentSource() === "fixtures" ? fixture : real) as CareersSnapshot;
}
