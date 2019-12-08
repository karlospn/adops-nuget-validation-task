
export interface Whitelist {
    nugets: nuget[]
}

export interface nuget{
    name: string;
    version: string[];
}

export interface result {
    validations: validation[]
}

export interface validation{
    isOk: boolean;
    message: string;
}

export interface nugetCandidates{
    name: string;
    version: string[];
    scoring: number
}