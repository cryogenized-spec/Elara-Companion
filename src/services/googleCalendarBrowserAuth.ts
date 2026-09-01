import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import { setCalendarTokenProvider } from './googleCalendarService';

setCalendarTokenProvider(async (capability) => {
  const grantedScopes = googleCapabilities.getGrantedScopes();
  if (!googleIdentity.isAuthorized() || !googleCapabilities.isGranted(grantedScopes, capability)) {
    const scopes = googleCapabilities.getScopes(capability);
    const result = await googleIdentity.requestCapabilityAuthorization(scopes, false);
    if (!result) throw new Error('Google Calendar authorization was not granted.');
  }

  const token = googleIdentity.getAccessToken();
  if (!token) throw new Error('Google Calendar authorization is required.');
  return token;
});
