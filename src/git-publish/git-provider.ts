/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

export type protocol = 'ssh' | 'https';
export type gitProviders = 'github' | 'gitlab';

export abstract class GitProvider {
    protected constructor(public host: string, public organizationOrUser: string, public name: string) {}

    origin(protocol: protocol) {
        const protocols = {
            ssh: `git@${this.host}:${this.organizationOrUser}/${this.name}.git`,
            https: `https://${this.host}/${this.organizationOrUser}/${this.name}`
        };
        if (protocols[protocol]) {
            return protocols[protocol];
        } else {
            throw new Error(`${protocol} is not an protocol`);
        }
    }

    abstract createPRUrl?(baseBranch: string, headBranch: string, headBranchRepo?: string): string;
}

export class GitHubProvider extends GitProvider {
    constructor(organizationOrUser: string, name: string) {
        super('github.com', organizationOrUser, name);
    }

    createPRUrl(baseBranch: string, headBranch: string): string {
        const repoUrl = `https://${this.host}/${this.organizationOrUser}/${this.name}`;
        return `${repoUrl}/pull/new/${baseBranch}...${headBranch}`;
    }
}

export class GitLabProvider extends GitProvider {
    constructor(organizationOrUser: string, name: string) {
        super('gitlab.com', organizationOrUser, name);
    }

    createPRUrl(baseBranch: string, headBranch: string): string {
        const repoUrl = `https://${this.host}/${this.organizationOrUser}/${this.name}`;
        return `${repoUrl}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${headBranch}&merge_request%5Btarget_branch%5D=${baseBranch}`;
    }
}

export function buildGitProvider(provider: gitProviders, organizationOrUser: string, name: string) {
    switch (provider) {
        case 'github':
            return new GitHubProvider(organizationOrUser, name);
        case 'gitlab':
            return new GitLabProvider(organizationOrUser, name);
        default:
            throw new Error(`${provider} provider is not support`);
    }
}

export function buildGitProviderFromRemote(remoteUrl: string): GitProvider | undefined {
    let host: 'github.com' | 'gitlab.com' | undefined;
    if (remoteUrl.includes('github.com')) {
        host = 'github.com';
    } else if (remoteUrl.includes('gitlab.com')) {
        host = 'gitlab.com';
    }

    if (!host) {
        return undefined;
    }

    const [orgOrUser, name] = remoteUrl
        .slice(remoteUrl.indexOf(host) + host.length + 1, remoteUrl.lastIndexOf('.git'))
        .split('/');
    if (host === 'github.com') {
        return new GitHubProvider(orgOrUser, name);
    }
    return new GitLabProvider(orgOrUser, name);
}
