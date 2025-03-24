import { Cell } from '@ton/core';

export type InitContract = {
    code: Cell;
    data: Cell;
};

export function getContractStateSize(init: InitContract) {
    const codeBits = init.code.bits.length;
    const dataBits = init.data.bits.length;
    const bits = codeBits + dataBits;

    const codeRefs = init.code.refs.length;
    const dataRefs = init.data.refs.length;
    const cells = 1 + codeRefs + dataRefs;

    return { bits, cells };
}
