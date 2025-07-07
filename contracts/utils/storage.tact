// STORAGE_GAS_BUFFER defines the gas buffer reserved for storage operations in the contract.
// The value is set to 0.02 TON to ensure there is enough gas for successful execution of storage-related
// transactions and to prevent failures due to insufficient gas.
const STORAGE_GAS_BUFFER: Int = ton("0.02");

/// Checks if the contract has enough balance to cover the required storage fees for a given
/// number of bits and cells over a specified duration.
/// 
/// @param bits The number of bits to be stored.
/// @param cells The number of cells to be stored.
/// @param duration The duration (in blocks or seconds, depending on context) for which storage is needed.
/// @return Bool Returns `true` if the remaining balance (after reserving the storage gas buffer)
///         is greater than or equal to the required storage fee, otherwise returns `false`.
fun checkEnoughStorageFunds(bits: Int, cells: Int, duration: Int): Bool {
    let required = getStorageFee(cells, bits, duration, false);
    let remaining_balance = myBalance() - STORAGE_GAS_BUFFER;
    return remaining_balance >= required;
}