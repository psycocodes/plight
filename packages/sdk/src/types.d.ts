
declare module 'snarkjs' {
    export const groth16: {
        fullProve(
            input: any,
            wasmFile: string | ArrayBuffer,
            zkeyFile: string | ArrayBuffer
        ): Promise<{ proof: any; publicSignals: string[] }>;
        
        verify(
            vKey: any,
            publicSignals: string[],
            proof: any
        ): Promise<boolean>;
    };
}

declare module 'circomlibjs' {
    export function buildPoseidon(): Promise<any>;
    export function buildEddsa(): Promise<any>;
}
