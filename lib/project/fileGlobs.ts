/**
 * Glob pattern to match all files in a project. Standard glob syntax.
 */
export const AllFiles = "**/**";

/**
 * Negative glob to exclude .git directory
 */
export const ExcludeGit = "!.git/**";

/**
 * Negative glob to exclude node_modules directory. We nearly always want to exclude
 * this when handling node projects, for performance reasons.
 */
export const ExcludeNodeModules = "!**/node_modules/**";

export const ExcludeTarget = "!target/**";

/**
 * Default exclusions (git and node modules).
 * Must be combined with a positive glob.
 */
export const DefaultExcludes = [ExcludeGit, ExcludeNodeModules, ExcludeTarget];

/**
 * Include all files except with default exclusions (git and node modules)
 */
export const DefaultFiles = [AllFiles].concat(DefaultExcludes);
