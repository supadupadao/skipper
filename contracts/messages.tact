/* Standard jetton messages */
message(0x7362d09c) JettonTransferNotification {
    query_id: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forward_payload: Slice as remaining;
}
message(0x0f8a7ea5) JettonTransfer {
    query_id: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining;
}
/* Lock messages */
message(0x690101) SendProxyMessage {
    to: Address;
    payload: Cell;
}
message(0x690102) ProxyMessage {
    owner: Address;
    unlock_date: Int as uint64;
    amount: Int as coins;
    payload: Cell;
}
message(0x690103) UnlockJettons {
}