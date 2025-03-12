import { address } from "@ton/core";

export const LOCK_INTERVAL = 1209600;
export const LOCK_MIN_INTERVAL = 86400;

export const ZERO_ADDRESS = address("0:0000000000000000000000000000000000000000000000000000000000000000");

export const OP_CODES = {
    /* Standard jetton messages */
    JettonTransferNotification: 0x7362d09c, // Notification about transfer from jetton wallet to owner
    JettonTransfer: 0x0f8a7ea5,             // New jetton transfer
    /* 01 - Lock messages */
    SendProxyMessage: 0x690101,             // Proxy message if sender is lock owner
    ProxyMessage: 0x690102,                 // Proxy message body
    UnlockJettons: 0x690103,                // Unlock jettons and send to owner jetton wallet
    LockJettons: 0x690104,                         // Lock the jettons
    /* 02 - Proposal messages */
    InitProposal: 0x690201,                 // Initialize new proposal
    UpdateVotes: 0x690202,                  // Update proposal votes
    ExecuteProposal: 0x690203,              // Send proposal body to destination
    /* 03 - Voter */
    InitVoter: 0x690301,                    // Initialize voter contract
    UpdateVoterBalance: 0x690302,           // Update jetton balance on voter contract
    /* 04 - Skipper */
    RequestNewProposal: 0x690401,           // Create new proposal
    VoteForProposal: 0x690402,              // Vote for proposal
};

export const EXIT_CODES = {
    InvalidOwner: 132,
    NeedFee: 6901,
    UnlockDateNotArrived: 6902,
    NotEnoughVotes: 6903,
    TooManyNoVotes: 6904,
    NotInitialized: 6905,
    AlreadyInitialized: 6906,
    ProposalExpired: 6907,
    AlreadyExecuted: 6908,
    ProxyOPCodeNotFound: 6909,
    UnlockDateInsufficient: 6910,
    InvalidLockPeriod: 6911, 
    LockPeriodTooShort: 6912,
    InvalidAmount: 6913
};
