export interface TeamInfo {
    /** The name of the team. */
    name: string;
    /** A link to the GitHub page for the team. */
    link: string|undefined;
    /** The URL slug of the team, similar to a username. */
    slug: string;
    /** Whether or not the user is a member of the team. */
    isMember: boolean;
}
