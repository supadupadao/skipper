// Default Tact error code for invalid owner
const ERROR_CODE_INVALID_OWNER: Int = 132;
// Need more TONs in request for fee
const ERROR_CODE_NEED_FEE: Int = 6901;
// Unlock date hasn't arrived
const ERROR_UNLOCK_DATE_NOT_ARRIVED: Int = 6902;
// No enough "yes" votes for proposal execution
const ERROR_NOT_ENOUGH_VOTES: Int = 6903;
// Too many "no" votes for proposal
const ERROR_TOO_MANY_NO_VOTES: Int = 6904;
// Contract is not initialized (if it can)
const ERROR_NOT_INITIALIZED: Int = 6905;
/// Contract already initialized (to avoid double initialization)
const ERROR_ALREADY_INITIALIZED: Int = 6906;
// Voting period for proposal has expired
const ERROR_PROPOSAL_EXPIRED: Int = 6907;
// Proposal already executed (to avoid double execution)
const ERROR_ALREADY_EXECUTED: Int = 6908;
// OP code not found for proxy message
const ERROR_PROXY_OPCODE_NOT_FOUND: Int = 6909;
// Unlock date is insufficient to cover proposal expiration date
const ERROR_UNLOCK_DATE_INSUFFICIENT: Int = 6910;
// Lock period must be greater than zero
const ERROR_INVALID_LOCK_PERIOD: Int = 6911;
// Lock period is too short and does not extend the current unlock date
const ERROR_LOCK_PERIOD_TOO_SHORT: Int = 6912;
// Amount provided must be greater than zero
const ERROR_CODE_INVALID_AMOUNT: Int = 6913;
// Insufficient storage fee for the contract
const ERROR_INSUFFICIENT_STORAGE_FEE: Int = 6914;
// Invalid expiration time for proposal or voter
const ERROR_INVALID_EXPIRATION_TIME: Int = 6915;
// Invalid owner address for jetton wallet
