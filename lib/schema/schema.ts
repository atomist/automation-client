/* tslint:disable */
//  This file was automatically generated and should not be edited.

export type ReposQueryVariables = {
    teamId: string,
    offset: number,
};

export type ReposQuery = {
    ChatTeam: Array<{
        __typename: "undefined",
        // ChatTeam orgs Org
        orgs: Array<{
            __typename: string,
            // Org repo Repo
            repo: Array<{
                __typename: string,
                // owner of  Repo
                owner: string | null,
                // name of  Repo
                name: string | null,
            } | null> | null,
        } | null> | null,
    } | null> | null,
};
/* tslint:enable */
