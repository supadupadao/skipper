export const OP_CODES = {
    /* Standard jetton messages */
    JettonTransferNotification: 0x7362d09c, // Notification about transfer from jetton wallet to owner
    JettonTransfer: 0x0f8a7ea5,             // New jetton transfer
    /* 01 - Lock messages */
    SendProxyMessage: 0x690101,             // Proxy message if sender is lock owner
    ProxyMessage: 0x690102,                 // Proxy message body
    UnlockJettons: 0x690103,                // Unlock jettons and send to owner jetton wallet
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