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
message(0x2c76b973) ProvideWalletAddress {
    query_id: Int as uint64;
    owner_address: Address;
    include_address: Bool;
}
message(0xd1735400) TakeWalletAddress {
    query_id: Int as uint64;
    wallet_address: Address;
    owner_address: Slice as remaining;
}
/* Common structs */
struct ProposalPayload {
    receiver: Address;
    body: Cell;
}
struct ProposalData {
    proposal_id: Int as uint64;
    is_initialized: Bool;
    is_executed: Bool;
    votes_yes: Int as coins;
    votes_no: Int as coins;
    expires_at: Int as uint64;
    payload: ProposalPayload?;
}
struct VoterData {
    proposal: Address;
    owner: Address;
    is_initialized: Bool;
    amount: Int as coins;
    expires_at: Int as uint64;
}
/* 00 - Minter messages */
message(0x690001) DeploySkipper {
    query_id: Int as uint64;
    jetton_master: Address;
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
    payload: ProposalPayload;
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
    expires_at: Int as uint64;
}
message(0x690302) UpdateVoterBalance {
    amount: Int as coins;
    vote: Int as uint1; // true = 1 | false = 0
    voter_unlock_date: Int as uint64;
}
/* 04 - Skipper */
message(0x690401) RequestNewProposal {
    payload: ProposalPayload;
}
message(0x690402) VoteForProposal {
    proposal_id: Int as uint64;
    vote: Int as uint1; // true = 1 | false = 0
}
message(0x690403) DeployLock {
    query_id: Int as uint64;
    owner: Address;
}
