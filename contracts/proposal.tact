import "./consts.tact";
import "./errors.tact";
import "./messages.tact";
const PROPOSAL_ACCEPT_THRESHOLD: Int = ton("300000");
const PROPOSAL_VOTES_GAP: Int = ton("10000");

contract Proposal {
    master: Address;
    proposal_id: Int as uint64;
    is_initialized: Bool = false;
    is_executed: Bool = false;
    votes_yes: Int as coins = 0;
    votes_no: Int as coins = 0;
    expires_at: Int as uint64;
    data: ProposalData? = null;
    
    init(master: Address, proposal_id: Int) {
        self.master = master;
        self.proposal_id = proposal_id;
        self.expires_at = now() + LOCK_INTERVAL;
    }

    receive(msg: InitProposal){
        nativeThrowIf(ERROR_ALREADY_INITIALIZED, self.is_initialized);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.master);

        self.data = msg.data;
        self.votes_yes = msg.amount;
        let voter_init: StateInit = initOf Voter(self.master, myAddress(), msg.initiator);
        self.is_initialized = true;

        // Calculate the expiration time
        if (msg.lock_period != null && msg.lock_period!! > 0) {
            let proposedExpiration = now() + msg.lock_period!!;
            self.expires_at = max(proposedExpiration, now() + LOCK_MIN_INTERVAL);
        } else {
            self.expires_at = now() + LOCK_INTERVAL;
        }

        // Ensure sufficient TON is sent to cover storage fees for the entire voting period
        let required_tons = self.estimateStorageFee(self.expires_at);
        nativeThrowUnless(ERROR_INSUFFICIENT_STORAGE_FEE, msg.amount >= required_tons);

        
        send(SendParameters{ // TODO update value
                to: contractAddress(voter_init),
                value: 0,
                mode: SendRemainingValue,
                bounce: true,
                code: voter_init.code,
                data: voter_init.data,
                body: InitVoter{
                    amount: msg.amount,
                    expires_at: self.expires_at
                    }.toCell()
            }
        );
    }

    receive(msg: UpdateVotes){
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.is_initialized);
        nativeThrowIf(ERROR_ALREADY_EXECUTED, self.is_executed);
        nativeThrowUnless(ERROR_PROPOSAL_EXPIRED, now() < self.expires_at);
        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, msg.amount <= 0);             

         // Check if unlock_date covers the proposal's expires_at
        nativeThrowUnless(ERROR_UNLOCK_DATE_INSUFFICIENT, msg.voter_unlock_date >= self.expires_at);
        let voter_init = initOf Voter(self.master, myAddress(), msg.owner);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == contractAddress(voter_init));

        if (msg.vote == 1) {
            self.votes_yes += msg.amount;
        }
        if (msg.vote == 0) {
            self.votes_no += msg.amount;
        }
    }

    receive(msg: ExecuteProposal){
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.is_initialized);
        nativeThrowIf(ERROR_ALREADY_EXECUTED, self.is_executed);
        nativeThrowUnless(ERROR_NOT_ENOUGH_VOTES, self.votes_yes > PROPOSAL_ACCEPT_THRESHOLD);
        nativeThrowUnless(ERROR_TOO_MANY_NO_VOTES, self.votes_yes > (self.votes_no + PROPOSAL_VOTES_GAP));
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.data != null);

        self.is_executed = true;
        send(SendParameters{
                to: self.data!!.receiver,
                value: 0,
                bounce: false,
                mode: SendRemainingBalance,
                body: self.data!!.body,
            }
        );
    }

    get fun get_proposal_data(): ProposalData? {
        return self.data;
    }
    
    get fun expires_at(): Int {
        return self.expires_at;
    }

    fun estimateStorageFee(expires_at: Int): Int {
        let contract_size_bytes: Int = 300; // Approximate contract size
        let per_byte_storage_fee: Int = 500; // Replace with actual network fee per byte

        let remaining_time: Int = expires_at - now(); // Time left until expiration
        nativeThrowUnless(ERROR_INVALID_EXPIRATION_TIME, remaining_time > 0);

        return contract_size_bytes * per_byte_storage_fee * remaining_time;
    }
}

contract Voter {
    master: Address;
    proposal: Address;
    owner: Address;
    is_initialized: Bool = false;
    amount: Int = 0;
    expires_at: Int as uint64;

    init(master: Address, proposal: Address, owner: Address){
        self.master = master;
        self.proposal = proposal;
        self.owner = owner;
        self.expires_at = now() + LOCK_INTERVAL;
    }

    receive(msg: InitVoter){
        nativeThrowIf(ERROR_ALREADY_INITIALIZED, self.is_initialized);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.proposal);
        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, msg.amount <= 0);             

        self.is_initialized = true;
        self.amount = msg.amount;
        self.expires_at = msg.expires_at;
    }

    receive(msg: UpdateVoterBalance){   
        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, msg.amount <= 0);             
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.master);  

        if(!self.is_initialized){
            self.expires_at = msg.voter_unlock_date;
            let required_tons = self.estimateStorageFee(self.expires_at);
            nativeThrowUnless(ERROR_INSUFFICIENT_STORAGE_FEE, msg.amount >= required_tons);
        }

        let newAmount = !self.is_initialized ? msg.amount : msg.amount - self.amount;

        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, newAmount <= 0);
        self.is_initialized = true;
        self.amount = msg.amount;
        

        send(SendParameters{
            to: self.proposal,
            value: 0,
            mode: SendRemainingValue,
            body: UpdateVotes{
                owner: self.owner, 
                amount: newAmount, // Send only the difference
                vote: msg.vote,
                voter_unlock_date: msg.voter_unlock_date
            }.toCell()
        });
    }

    get fun get_voter_amount(): Int {
        return self.amount;
    }

    
    fun estimateStorageFee(expires_at: Int): Int {
        let contract_size_bytes: Int = 300; // Approximate contract size
        let per_byte_storage_fee: Int = 500; // Replace with actual network fee per byte

        let remaining_time: Int = expires_at - now(); // Time left until expiration
        nativeThrowUnless(ERROR_INVALID_EXPIRATION_TIME, remaining_time > 0);

        return contract_size_bytes * per_byte_storage_fee * remaining_time;
    }
}