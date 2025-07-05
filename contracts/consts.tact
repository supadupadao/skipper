// Jetton lock TTL
const LOCK_INTERVAL: Int = 1209600; // 60 * 60 * 24 * 14 -> 14 days 
const LOCK_MIN_INTERVAL: Int = 86400; // 60 * 60 * 24 -> 1 day
// Fee for lock/unlock message
const MIN_LOCK_FEE: Int = ton("0.05");