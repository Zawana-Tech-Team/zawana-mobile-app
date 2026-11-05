import { Redirect } from 'expo-router';
/** Keep saved overview links working while Calendar is the badminton coach home. */
export function CoachHomeScreen() { return <Redirect href="/(staff)/calendar" />; }
