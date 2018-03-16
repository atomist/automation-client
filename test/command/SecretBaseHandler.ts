import {
    MappedParameter,
    MappedParameters,
    Secret,
    Secrets,
} from "../../src/decorators";

export abstract class SecretBaseHandler {

    @Secret(Secrets.userToken(["repo"]))
    public userToken: string;

    @MappedParameter(MappedParameters.SlackUser)
    public userName: string;

}
