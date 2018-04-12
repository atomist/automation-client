import { Field } from "@atomist/slack-messages";
import { isString } from "util";

/**
 * Defines an Ingester as per automation-api.
 *
 * An Ingester is a collection of GraphQL types and a pointer to the root type in the
 * root_type field.
 */
export interface Ingester {
    root_type: any | string;
    types: ObjectType[];
}

/**
 * Describes root level GraphQL types
 */
export interface ObjectType {
    kind: "OBJECT";
    name: string;
    description?: string;
    fields: FieldType[];
}

/**
 * Describes fields of ObjectType root level GraphQL types
 */
export interface FieldType {
    name: string;
    description?: string;
    args?: FieldType[];
    type: {
        kind: "SCALAR" | "LIST" | "OBJECT";
        name?: string | "String" | "Int" | "Float" | "Boolean";
        ofType?: {
            kind: "OBJECT" | "SCALAR";
            name: string;
        }
    };
    directives?: Array<{
        name: string,
    }>;
    defaultValue?: any;
}

/**
 * Builder to construct Ingester instances fluently
 */
export class IngesterBuilder {

    private types: ObjectType[] = [];
    private name: string;

    constructor(public rootType: string | TypeBuilder) {
        if (isString(rootType)) {
            this.name = rootType as string;
        } else {
            this.name = (rootType as TypeBuilder).name;
            this.types.push((rootType as TypeBuilder).build(this.types));
        }
    }

    public withType(builder: TypeBuilder): IngesterBuilder {
        this.types.push(builder.build(this.types));
        return this;
    }

    public build(): Ingester {
        return {
            root_type: this.name,
            types: this.types,
        };
    }
}

/**
 * Builder to construct TypeBuilder instances fluently
 */
export class TypeBuilder {

    private fields: FieldType[] = [];

    constructor(public name: string, public description?: string) { }

    public withScalarField(name: string,
                           kind: "String" | "Int" | "Float" | "Boolean",
                           description?: string,
                           directives: string[] = []): TypeBuilder {
        const field: FieldType = {
            name,
            type: {
                kind: "SCALAR",
                name: kind,
            },
        };
        if (description) {
            field.description = description;
        }
        if (directives.length > 0) {
            field.directives = directives.map(d => ({ name: d }));
        }
        this.fields.push(field);
        return this;
    }

    public withObjectField(name: string, object: string | TypeBuilder,
                           description?: string,
                           args: string[] = [],
                           directives: string[] = []): TypeBuilder {
        const field: FieldType = {
            name,
            args: args as any as FieldType[],
            type: {
                kind: "OBJECT",
                name: isString(object) ? object : (object as TypeBuilder).name,
            },
        };
        if (description) {
            field.description = description;
        }
        if (directives.length > 0) {
            field.directives = directives.map(d => ({ name: d }));
        }
        this.fields.push(field);
        return this;
    }

    public withStringField(name: string, description?: string, directives: string[] = []): TypeBuilder {
        return this.withScalarField(name, "String", description, directives);
    }

    public withBooleanField(name: string, description?: string, directives: string[] = []): TypeBuilder {
        return this.withScalarField(name, "Boolean", description, directives);
    }

    public withFloatField(name: string, description?: string, directives: string[] = []): TypeBuilder {
        return this.withScalarField(name, "Float", description, directives);
    }

    public withIntField(name: string, description?: string, directives: string[] = []): TypeBuilder {
        return this.withScalarField(name, "Int", description, directives);
    }

    public withListScalarField(name: string,
                               kind: "String" | "Int" | "Float" | "Boolean",
                               description?: string): TypeBuilder {
        const field: FieldType = {
            name,
            type: {
                kind: "LIST",
                ofType: {
                    kind: "SCALAR",
                    name: kind,
                },
            },
        };
        if (description) {
            field.description = description;
        }
        this.fields.push(field);
        return this;
    }

    public withListObjectField(name: string,
                               object: string | TypeBuilder,
                               description: string = null,
                               args: string[] = []): TypeBuilder {
        const field: FieldType = {
            name,
            args: args as any as FieldType[],
            type: {
                kind: "LIST",
                ofType: {
                    kind: "OBJECT",
                    name: isString(object) ? object : (object as TypeBuilder).name,
                },
            },
        };
        if (description) {
            field.description = description;
        }
        this.fields.push(field);
        return this;
    }

    public build(types: ObjectType[]): ObjectType {
        this.fields.filter(
            f => f.type.kind === "OBJECT" || (f.type.kind === "LIST" && f.type.ofType.kind === "OBJECT")).forEach(f => {
            f.args = (f.args || []).map(a => {
                const refType = types.find(t => t.name === (f.type.name || (f.type.ofType && f.type.ofType.name)));
                if (refType) {
                    const refFieldType = refType.fields.find(fi => fi.name as any === a);
                    if (refFieldType) {
                        if (refFieldType.type.kind === "OBJECT") {
                            throw new Error(
                                `Referenced type '${f.type.name}' in arg '${a}' is of type OBJECT. Only SCALAR is supports as args`);
                        }
                        const argsType = {
                            ...refFieldType,
                            // TODO what are those default values
                            defaultValue: null,
                            type: {
                                kind: "LIST",
                                ofType: {
                                    kind: "SCALAR",
                                    name: refFieldType.type.name,
                                },
                            },
                        };
                        delete argsType.args;
                        delete argsType.directives;
                        return argsType as any as FieldType;
                    }
                }
                throw new Error(
                    `Referenced type '${f.type.name}' in arg '${a}' of field '${f.name}' in type '${this.name}' could not be found`);
            });
            if (!f.args || f.args.length === 0) {
                delete f.args;
            }
        });
        const object: ObjectType = {
            kind: "OBJECT",
            name: this.name,
            fields: this.fields,
        };
        if (this.description) {
            object.description = this.description;
        }
        return object;
    }
}

/**
 * Create an IngesterBuilder for the provided rootType.
 *
 * If rootType is TypeBuilder instance, it is added to the types collection.
 * Therefore there is no need to call withType on the rootType.
 * @param {string | TypeBuilder} rootType
 * @returns {IngesterBuilder}
 */
export function ingester(rootType: string | TypeBuilder): IngesterBuilder {
    return new IngesterBuilder(rootType);
}

/**
 * Create a TypeBuilder for the provided name.
 * @param {string} name
 * @returns {TypeBuilder}
 */
export function type(name: string): TypeBuilder {
    return new TypeBuilder(name);
}
