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
    fields: FieldType[];
}

/**
 * Describes fields of ObjectType root level GraphQL types
 */
export interface FieldType {
    name: string;
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
            this.types.push((rootType as TypeBuilder).build());
        }
    }

    public withType(builder: TypeBuilder): IngesterBuilder {
        this.types.push(builder.build());
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
 * Builder to construct ObjectType instances fluently
 */
export class TypeBuilder {

    private fields: FieldType[] = [];

    constructor(public name) { }

    public withScalarField(name: string, kind: "String" | "Int" | "Float" | "Boolean", directives: string[] = []): TypeBuilder {
        const field: FieldType = {
            name,
            type: {
                kind: "SCALAR",
                name: kind,
            },
        };
        if (directives.length > 0) {
            field.directives = directives.map(d => ({ name: d }));
        }
        this.fields.push(field);
        return this;
    }

    public withObjectField(name: string, object: string | TypeBuilder, ...directives: string[]): TypeBuilder {
        const field: FieldType = {
            name,
            type: {
                kind: "OBJECT",
                name: isString(object) ? object : (object as TypeBuilder).name,
            },
        };
        if (directives.length > 0) {
            field.directives = directives.map(d => ({ name: d }));
        }
        this.fields.push(field);
        return this;
    }

    public withStringField(name: string, ...directives: string[]): TypeBuilder {
        return this.withScalarField(name, "String", directives);
    }

    public withBooleanField(name: string, ...directives: string[]): TypeBuilder {
        return this.withScalarField(name, "Boolean", directives);
    }

    public withFloatField(name: string, ...directives: string[]): TypeBuilder {
        return this.withScalarField(name, "Float", directives);
    }

    public withIntField(name: string, ...directives: string[]): TypeBuilder {
        return this.withScalarField(name, "Int", directives);
    }

    public withListScalarField(name: string, kind: "String" | "Int" | "Float" | "Boolean"): TypeBuilder {
        this.fields.push({
            name,
            type: {
                kind: "LIST",
                ofType: {
                    kind: "SCALAR",
                    name: kind,
                },
            },
        });
        return this;
    }

    public withListObjectField(name: string, object: string | TypeBuilder): TypeBuilder {
        this.fields.push({
            name,
            type: {
                kind: "LIST",
                ofType: {
                    kind: "OBJECT",
                    name: isString(object) ? object : (object as TypeBuilder).name,
                },
            },
        });
        return this;
    }

    public build(): ObjectType {
        return {
            kind: "OBJECT",
            name: this.name,
            fields: this.fields,
        };
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
