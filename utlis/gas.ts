import type { Blockchain } from "@ton/sandbox";
import type { Address, Cell } from "@ton/core";

const calculateCellsAndBits = (
    root: Cell,
    visited: Set<string> = new Set<string>(),
) => {
    const hash = root.hash().toString("hex");
    if (visited.has(hash)) {
        return { cells: 0, bits: 0 };
    }
    visited.add(hash);

    let cells = 1;
    let bits = root.bits.length;
    for (const ref of root.refs) {
        const childRes = calculateCellsAndBits(ref, visited);
        cells += childRes.cells;
        bits += childRes.bits;
    }
    return { cells, bits };
};

export async function getStateSizeForAccount(
    blockchain: Blockchain,
    address: Address,
): Promise<{ cells: number; bits: number }> {
    const accountState = (await blockchain.getContract(address)).accountState;
    if (!accountState || accountState.type !== "active") {
        throw new Error("Account state not found");
    }
    if (!accountState.state.code || !accountState.state.data) {
        throw new Error("Account state code or data not found");
    }
    const accountCode = accountState.state.code;
    const accountData = accountState.state.data;

    const codeSize = calculateCellsAndBits(accountCode);
    const dataSize = calculateCellsAndBits(accountData);

    return {
        cells: codeSize.cells + dataSize.cells,
        bits: codeSize.bits + dataSize.bits,
    };
}