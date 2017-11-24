
export interface ValidationError {
    message: string;
}

export type ValidationResult = void | ValidationError;

export function isValidationError(vr: ValidationResult): vr is ValidationError  {
    const maybeErr = vr as ValidationError;
    return !!maybeErr && !!maybeErr.message;
}

/**
 * Interface optionally implemented by parameters objects--whether HandleCommand
 * instances or external objects--to perform any binding logic and validate their parameters.
 * Allows returning a promise so that implementations can perform network calls etc
 * to validate. Simply return void if binding without validation.
 */
export interface SmartParameters {

    bindAndValidate(): ValidationResult | Promise<ValidationResult>;
}

export function isSmartParameters(a: any): a is SmartParameters {
    const mightBeSmart = a as SmartParameters;
    return !!mightBeSmart && !!mightBeSmart.bindAndValidate;
}
