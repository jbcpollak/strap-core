import * as OctoKit from '@octokit/rest';
import {Logger} from 'pino';

import {PinoLoggerService} from '../logger/logger.service';
import {getAll} from '../utils/get-all';
import {Organization} from './organization';
import {Team} from './team';
import {User} from './user';
import {UserOrganization} from './user-organization';

export class GitHubSource {
	private octoKit = new OctoKit();
	private readonly logger: Logger;

	constructor(
		token: string,
		logger: PinoLoggerService,
	) {
		this.logger = logger.child('GitHub');

		this.octoKit.authenticate({type: 'oauth', token});
	}

	async getUser(): Promise<User> {
		const {data}: {data: User} = await this.octoKit.users.getAuthenticated({});
		return data;
	}

	async getUserOrganizations(): Promise<UserOrganization[]> {
		const {data} = await this.octoKit.orgs.listForAuthenticatedUser({});
		return data;
	}

	async getUserTeams(): Promise<OctoKit.TeamsListForAuthenticatedUserResponse> {
		const {data} = await this.octoKit.teams.listForAuthenticatedUser({});
		return data;
	}

	async getOrganization(login: string): Promise<Organization> {
		this.logger.info(`getting organization with login '${login}'`);
		const {data}: {data: Organization} = await this.octoKit.orgs.get({org: login.toString()});
		this.logger.debug(data, `got organization`);
		return data;
	}

	async getOrganizations(logins: string[]): Promise<Organization[]> {
		this.logger.debug(logins, 'getting organizations with logins:');
		return await getAll<string, Organization>(logins, this.getOrganization.bind(this));
	}

	async getTeam(id: number): Promise<OctoKit.TeamsGetResponse> {
		this.logger.info(`getting team with id '${id}'`);
		const {data} = await this.octoKit.teams.get({
			team_id: id,
		});
		// data.html_url = `https://github.com/orgs/${data.organization.login}/teams/${data.slug}`;
		this.logger.debug(data, `got team`);
		return data;
	}

	async getTeams(ids: number[]): Promise<OctoKit.TeamsGetResponse[]> {
		this.logger.debug(ids, 'getting teams with IDs:');
		return await getAll<number, OctoKit.TeamsGetResponse>(ids, this.getTeam.bind(this));
	}

	/**
	 * Get child teams of a team that are direct descendants of the team (does not recurse)
	 * @param id A team ID
	 */
	async getChildTeams(id: number): Promise<Team[]> {
		this.logger.info(`getting child teams of team with id '${id}'`);
		const {data}: {data: Team[]} = await this.octoKit.teams.listChild({
			team_id: id,
		});
		this.logger.debug(data, `got child teams of team with id '${id}'`);
		return data;
	}

	/**
	 * Recursively get all of the child teams of a the given teams as a one-dimensional array
	 * @param teams A list of teams
	 */
	async getChildTeamsRecursively(teams: OctoKit.TeamsGetResponse[]): Promise<Team[]> {
		// Get child teams of each provided team
		const childTeams: Team[][] = await Promise.all(teams.map((team) => this.getChildTeams(team.id)));

		// We do not care about hierarchy, so flatten the teams into a one-dimensional array
		const flatChildTeams: Team[] = ([] as Team[]).concat(...childTeams);

		this.logger.debug({teams, flatChildTeams}, 'got child teams recursively');

		if (flatChildTeams.length > 0) {
			return teams.concat(await this.getChildTeamsRecursively(flatChildTeams));
		} else {
			return teams;
		}
	}

	/**
	 * Recursively get all child teams of a given team as a one-dimensional array
	 * @param id A team ID
	 */
	async getAllChildTeams(id: number): Promise<OctoKit.TeamsGetResponse[]> {
		const team = await this.getTeam(id);
		return await this.getChildTeamsRecursively([team]);
	}
}
