// This file defines all message types and data structures used for interaction between Skipper DAO contracts.
// Messages are grouped by contract type: Jetton, Minter, Lock, Proposal, Voter, Skipper.

/* Standard jetton messages */

// Jetton standard messages for token transfers, notifications, and wallet address management
// Notification about jetton transfer (sent to recipient)
message(0x7362d09c) JettonTransferNotification {
    query_id: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forward_payload: Slice as remaining;
}
// Request to transfer jettons to another address
message(0x0f8a7ea5) JettonTransfer {
    query_id: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining;
}
// Request to provide the wallet address for a jetton owner
message(0x2c76b973) ProvideWalletAddress {
    query_id: Int as uint64;
    owner_address: Address;
    include_address: Bool;
}
// Response with the wallet address for a jetton owner
message(0xd1735400) TakeWalletAddress {
    query_id: Int as uint64;
    wallet_address: Address;
    owner_address: Slice as remaining;
}

/* Common structs */

// Payload for a proposal execution (target receiver and body)
struct ProposalPayload {
    receiver: Address;
    body: Cell;
}
// Data structure for storing proposal state
struct ProposalData {
    proposal_id: Int as uint64;
    is_initialized: Bool;
    is_executed: Bool;
    votes_yes: Int as coins;
    votes_no: Int as coins;
    expires_at: Int as uint64;
    payload: ProposalPayload?;
}
// Data structure for storing voter state
struct VoterData {
    proposal: Address;
    owner: Address;
    is_initialized: Bool;
    amount: Int as coins;
    expires_at: Int as uint64;
}

/* 00 - Minter messages */

// Message to deploy the Skipper contract from the Minter
message(0x690001) DeploySkipper {
    query_id: Int as uint64;
    jetton_master: Address;
}

/* 01 - Lock messages */

// Message to send a proxy message through the Lock contract
message(0x690101) SendProxyMessage {
    to: Address;
    lock_period: Int? as uint64;
    payload: Cell;
}
// Message for proxying actions with lock and voting data
message(0x690102) ProxyMessage {
    owner: Address;
    lock_period: Int? as uint64;
    voter_unlock_date: Int as uint64;
    amount: Int as coins;
    payload: Cell;
}
// Message to unlock jettons
message(0x690103) UnlockJettons {
}
// Message to lock jettons for a specified period
message(0x690104) LockJettons {
    lock_period: Int as uint64;
}

/* 02 - Proposal messages */

// Message to initialize a new proposal
message(0x690201) InitProposal {
    initiator: Address;
    amount: Int as coins;
    payload: ProposalPayload;
    lock_period: Int? as uint64;
}
// Message to update votes for a proposal
message(0x690202) UpdateVotes {
    owner: Address;
    amount: Int as coins;
    vote: Int as uint1;
    voter_unlock_date: Int as uint64;
}
// Message to execute a proposal after voting ends
message(0x690203) ExecuteProposal {
}

/* 03 - Voter */

// Message to initialize a new voter for a proposal
message(0x690301) InitVoter {
    amount: Int as coins;
    expires_at: Int as uint64;
}
// Message to update voter's balance and vote
message(0x690302) UpdateVoterBalance {
    amount: Int as coins;
    vote: Int as uint1;
    voter_unlock_date: Int as uint64;
}

/* 04 - Skipper */

// Message to request creation of a new proposal via Skipper
message(0x690401) RequestNewProposal {
    payload: ProposalPayload;
}
// Message to vote for a proposal via Skipper
message(0x690402) VoteForProposal {
    proposal_id: Int as uint64;
    vote: Int as uint1;
}
