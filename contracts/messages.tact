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
/* Common structs */
struct ProposalData {
    receiver: Address;
    body: Cell;
}
/* 01 - Lock messages */
message(0x690101) SendProxyMessage {
    to: Address;
    lock_period: Int? as uint64; // for the contract
    payload: Cell;
}
message(0x690102) ProxyMessage {
    owner: Address;
    lock_period: Int? as uint64;        // for the contract
    voter_unlock_date: Int as uint64;   // of the lock , only needed when we participate in a proposal
    amount: Int as coins;
    payload: Cell;
}
message(0x690103) UnlockJettons {
}
message(0x690104) LockJettons {
    lock_period: Int as uint64;
}
/* 02 - Proposal messages */
message(0x690201) InitProposal {
    initiator: Address;
    amount: Int as coins;
    data: ProposalData;
    lock_period: Int? as uint64;
}
message(0x690202) UpdateVotes {
    owner: Address;
    amount: Int as coins;
    vote: Int as uint1; // true = 1 | false = 0
    voter_unlock_date: Int as uint64;
}
message(0x690203) ExecuteProposal {
}
/* 03 - Voter */
message(0x690301) InitVoter {
    amount: Int as coins;
}
message(0x690302) UpdateVoterBalance {
    amount: Int as coins;
    vote: Int as uint1; // true = 1 | false = 0
    voter_unlock_date: Int as uint64;
}
/* 04 - Skipper */
message(0x690401) RequestNewProposal {
    data: ProposalData;
}
message(0x690402) VoteForProposal {
    proposal_id: Int as uint64;
    vote: Int as uint1; // true = 1 | false = 0
}
