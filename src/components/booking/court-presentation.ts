import type { Court } from "../../booking/types.ts";

export type BookingFloor = "2nd Floor" | "6th Floor";
export const bookingFloors: readonly BookingFloor[] = ["2nd Floor", "6th Floor"];

/** Display metadata only: identifiers and booking rules remain server-owned. */
export function courtFloor(court: Pick<Court, "surface">): BookingFloor | null {
  const surface = court.surface.trim().toLowerCase();
  if (surface === "2nd floor") return "2nd Floor";
  if (surface === "6th floor") return "6th Floor";
  return null;
}

export function courtsOnFloor(courts: readonly Court[], floor: BookingFloor) {
  return courts.filter((court) => courtFloor(court) === floor);
}

export const courtSurfaceColors = {
  "2nd Floor": "#38675F",
  "6th Floor": "#A64D59",
} as const;
