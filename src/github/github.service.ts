import {Logger} from 'pino';

import {PinoLoggerService} from '../logger/logger.service';
import {getAll} from '../utils/get-all';
import {GitHubSource} from './github-source';
import {OrganizationInfo} from './organization-info';
import {TeamInfo} from './team-info';
import {ConfigService, GitHubConfig} from '../config/config.service';

export class GitHubService {
	private readonly logger: Logger;
	private readonly config: GitHubConfig;

	constructor(
		private readonly gitHub: GitHubSource,
		logger: PinoLoggerService,
		configService: ConfigService,
	) {
		this.logger = logger.child('GitHubService');
		this.config = configService.config;
	}

	/**
	 * Get user credentials
	 */
	async getUserCredentials() {
		const user = await this.gitHub.getUser();
		return {
			gitName: user.name,
			gitEmail: user.email,
			gitHubUser: user.login,
		};
	}

	/**
	 * Check whether the authenticatd user is in an organization or not
	 * @param login ID of a GitHub organization
	 */
	async isInOrganization(login: string): Promise<boolean> {
		const organizations = await this.gitHub.getUserOrganizations();
		return organizations.some((org) => org.login === login);
	}

	/**
	 * Check whether the authenticated user is in a team or not
	 * @description Each GitHub team can have multiple levels of child teams, so this method needs to get the IDs of all
	 * child teams of the given team and check against them.
	 * @param isInTeamId ID of a GitHub team
	 */
	async isInTeam(isInTeamId: number): Promise<boolean> {
		const [userTeams, childTeams] = await Promise.all([
			this.gitHub.getUserTeams(),
			this.gitHub.getAllChildTeams(isInTeamId),
		]);

		const validTeamIds = [
			isInTeamId,
			...childTeams.map((team) => team.id),
		];

		this.logger.debug({validTeamIds}, `valid team IDs for checking if a user is in team with ID '${isInTeamId}'`);
		this.logger.debug({
			userTeamIds: userTeams.map((team) => `${team.id}: (${team.slug})`),
		}, 'IDs (Slugs) of teams the user is in');

		// Determine if any team or team's parent matches the given team ID
		return userTeams.some((team) => {
			return validTeamIds.includes(team.id);
		});
	}

	async isInOrganizations(logins: string[]) {
		return getAll<string, boolean>(logins, this.isInOrganization.bind(this));
	}

	async isInTeams(ids: number[]) {
		return getAll<number, boolean>(ids, this.isInTeam.bind(this));
	}

	/**
	 * Get information about a list of organizations
	 * @param organizationLogins organization logins
	 */
	async getOrgInfo(): Promise<OrganizationInfo[]> {
		const organizationLogins = this.config.organizationLogins;

		const [organizations, orgMemberships] = await Promise.all([
			this.gitHub.getOrganizations(organizationLogins),
			this.isInOrganizations(organizationLogins),
		]);

		return organizations.map((org, index) => ({
			name: org.name,
			link: org.html_url,
			isMember: orgMemberships[index],
		}));
	}

	/**
	 * Get information about a list of teams and whether or not the user is a member of each team (or any of its child
	 * teams)
	 */
	async getTeamInfo(): Promise<TeamInfo[]> {
		const teamIds = this.config.teamIds;

		const [teams, teamMemberships] = await Promise.all([
			await this.gitHub.getTeams(teamIds),
			await this.isInTeams(teamIds),
		]);

		return teams.map((team, index) => ({
			name: team.name,
			link: team.html_url,
			slug: team.slug,
			isMember: teamMemberships[index],
		}));
	}
}
