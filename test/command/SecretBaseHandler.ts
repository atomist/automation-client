import { Secrets, Secret, MappedParameters, MappedParameter } from "../../src/Handlers";

export abstract class SecretBaseHandler {

    @Secret(Secrets.userToken(["repo"]))
    public userToken: string;

    @MappedParameter(MappedParameters.SlackUser)
    public userName: string;

}