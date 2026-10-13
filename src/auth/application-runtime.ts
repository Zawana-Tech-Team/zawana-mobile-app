import type { Onboarding, PhoneProofChallenge } from "./types";

type RuntimeState = {
  accessToken: string;
  refreshToken: string;
  remember: boolean;
  mounted: boolean;
  generation: number;
  pending: boolean;
  intent: "signin" | "signup" | "link";
  challenge: PhoneProofChallenge | null;
  registration: Onboarding | null;
  registrationReady: boolean;
  linkingToken: string;
  previousPhoneSignIn: string | null;
  refreshFlight: Promise<void> | null;
};
/** Imperative credentials stay outside React's render state and never become route authorization by themselves. */
export class ApplicationRuntime {
  private data: RuntimeState = {
    accessToken: "",
    refreshToken: "",
    remember: true,
    mounted: false,
    generation: 0,
    pending: false,
    intent: "signin",
    challenge: null,
    registration: null,
    registrationReady: false,
    linkingToken: "",
    previousPhoneSignIn: null,
    refreshFlight: null,
  };
  get state(): Readonly<RuntimeState> {
    return { ...this.data };
  }
  set<K extends keyof RuntimeState>(key: K, value: RuntimeState[K]) {
    this.data[key] = value;
  }
  invalidate() {
    this.data.generation++;
  }
}
