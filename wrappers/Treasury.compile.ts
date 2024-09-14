import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/treasury.tact',
    options: {
        debug: true,
    },
};
