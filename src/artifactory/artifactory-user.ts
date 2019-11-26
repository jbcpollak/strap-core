export interface ArtifactoryUser {
  name: string,
  email: string,
  admin: boolean,
  profileUpdatable: boolean,
  internalPasswordDisabled: boolean,
  groups: string[],
  lastLoggedIn: string,
  lastLoggedInMillis: number,
  realm: string,
  offlineMode: boolean,
  disableUIAccess: boolean,
}
