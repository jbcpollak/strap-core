export interface OrganizationInfo {
    /** The name of the organization. */
    name: string;
    /** A link to the GitHub page for the organization. */
    link: string;
    /** Whether or not the current user is a member of the organization. */
    isMember: boolean;
}
