/**
 * Details common to commands created via functions
 */
export interface CommandDetails {

    description: string;
    intent?: string | string[];
    tags?: string | string[];

}
