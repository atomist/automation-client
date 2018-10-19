/**
 * A Fingerprint (aka FingerprintData) represents some property of the code in a repository
 * as of a particular commit.
 *
 * It might be the set of dependencies, or the count of tests, or a set of contributors.
 *
 * The data here represents a particular fingerprint value. The name, version, and abbreviation
 * identify the fingerprinted property; data and sha represent the value of that property.
 * This will be associated with a commit on a repository.
 */
export interface Fingerprint {

    /**
     * Name of the fingerprint. This should be a constant.
     */
    name: string;

    /**
     * Version of the fingerprinting function. If you update your fingerprinting algorithm,
     * increment this constant.
     */
    version: string;

    /**
     * A shorter name. This should be a constant.
     */
    abbreviation: string;

    /**
     * Full data of the fingerprint: whatever text identifies the property you're representing.
     *
     * This might be a stringified map of dependency to version, for instance.
     */
    data: string;

    /**
     * A short string that identifies the data uniquely. Used for fast comparison
     */
    sha: string;
}
