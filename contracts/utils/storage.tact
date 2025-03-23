const STORAGE_GAS_BUFFER: Int = ton("0.02");

fun checkEnoughStorageFunds(bits: Int, cells: Int, duration: Int): Bool {
    let required = getStorageFee(cells, bits, duration, false);
    let remaining_balance = myBalance() - STORAGE_GAS_BUFFER;
    return remaining_balance >= required;
}