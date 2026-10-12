import { Redirect } from 'expo-router';

// Completion presentation is a later UI phase. This route requires backend-validated membership.
export default function Complete() { return <Redirect href="/home" />; }
