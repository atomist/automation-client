export const GitHubNameRegExp = {
    pattern: /^[-.\w]+$/,
    validInput: "a valid GitHub identifier which consists of alphanumeric, ., -, and _ characters",
};

export const GitBranchRegExp = {
    // not perfect, but pretty good
    pattern: /^\w(?:[./]?[-\w])*$/,
    validInput: "a valid Git branch name, see" +
    " https://www.kernel.org/pub/software/scm/git/docs/git-check-ref-format.html",
};

export const GitShaRegExp = {
    pattern: /^[0-9a-f]{40}$/,
    validInput: "40 hex digits, lowercase",
};
