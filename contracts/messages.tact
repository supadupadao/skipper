/*** JETTON STANDARD MESSAGES ***/
message(0x0f8a7ea5) JettonTransfer {
    query_id: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining;
}
message(0x178d4519) JettonTransferInternal {
    query_id: Int as uint64;
    amount: Int as coins;
    from: Address;
    response_destination: Address;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining;
}
message(0x7362d09c) JettonTransferNotification {
    query_id: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forward_payload: Slice as remaining;
}
message(0x595f07bc) JettonBurn {
    query_id: Int as uint64;
    amount: Int as coins;
    response_destination: Address;
    custom_payload: Cell?;
}
message(0x7bdd97de) JettonBurnInternal {
    query_id: Int as uint64;
    amount: Int as coins;
    sender: Address;
    response_destination: Address;
}
message(0xd53276db) Excesses {
    query_id: Int as uint64;
}
message(0x690001) RequestNewProposal {
    query_id: Int as uint64;
    transaction: Cell;
}
message(0x690002) RequestVoteYes {
    query_id: Int as uint64;
    proposal_id: Int as uint64;
}
message(0x690003) RequestVoteNo {
    query_id: Int as uint64;
    proposal_id: Int as uint64;
}
message(0x690101) NewProposal {
    query_id: Int as uint64;
    author: Address;
    transaction: Cell;
}
message(0x690201) InitProposal {
    query_id: Int as uint64;
    transaction: Cell;
}