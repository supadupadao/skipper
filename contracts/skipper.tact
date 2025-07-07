// Main contract of Skipper DAO system. Responsible for proposal creation, voting, and coordination between JettonLock, Proposal, and Voter contracts.
// Provides utility getters for addresses and stores the last proposal id.

import "@stdlib/deploy";
import "./errors.tact";
import "./lock.tact";
import "./proposal.tact";
import "./messages";
import "./consts.tact";
import "./utils/storage.tact";


// Minter contract: deploys the Skipper contract on request
contract Minter with Deployable {

    // Deploys the Skipper contract for specified jetton master
    receive(msg: DeploySkipper) {
        let skipper_init = initOf Skipper(msg.jetton_master);
        deploy(DeployParameters {
            init: skipper_init,
            value: 0,
            mode: SendRemainingValue,
            body: Deploy {
                queryId: msg.query_id,
            }.toCell(),
        });
    }

    receive(_msg: Slice) {}
}


// Structure for storing Skipper contract state
struct SkipperData {
    last_proposal_id: Int as uint64;
}


// Skipper contract: main DAO logic for proposals and voting
contract Skipper with Deployable {
    jetton_master: Address;
    last_proposal_id: Int as uint64 = 0;

    // Contract initialization
    init(jetton_master: Address){
        self.jetton_master = jetton_master;
    }

    // Handles ProxyMessage from JettonLock contract
    // - If opcode is 0x690401: deploys new Proposal contract
    // - If opcode is 0x690402: deploys new Voter contract and updates vote
    receive(msg: ProxyMessage){
        let jetton_lock_init = initOf JettonLock(msg.owner, self.jetton_master);
        let jetton_lock_address = contractAddress(jetton_lock_init);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == jetton_lock_address);
        let op = msg.payload.asSlice().loadUint(32);

        if (op == 0x690401) {            
            // Create new proposal
            let payload = RequestNewProposal.fromCell(msg.payload);
            self.last_proposal_id += 1;
            let new_proposal_init = initOf Proposal(myAddress(), self.last_proposal_id);
            deploy(DeployParameters{
                    value: 0,
                    mode: SendRemainingValue,
                    bounce: false,
                    init: new_proposal_init,
                    body: InitProposal{
                        initiator: msg.owner,
                        amount: msg.amount,
                        payload: payload.payload,
                        lock_period: msg.lock_period
                    }.toCell()
                }
            );
            return;
        }
        if (op == 0x690402) {
            // Vote for proposal
            let payload = VoteForProposal.fromCell(msg.payload);
            let proposal_init = initOf Proposal(myAddress(), payload.proposal_id);
            let voter_init = initOf Voter(myAddress(), contractAddress(proposal_init), msg.owner);            
            deploy(DeployParameters{
                    value: 0,
                    mode: SendRemainingValue,
                    init: voter_init,
                    bounce: false,
                    body: UpdateVoterBalance{
                        amount: msg.amount,
                        voter_unlock_date: msg.voter_unlock_date,
                        vote: payload.vote
                    }.toCell()
                }
            );
            return;
        }
        nativeThrow(ERROR_PROXY_OPCODE_NOT_FOUND);
    }

    // Returns Skipper contract state (last proposal id)
    get fun get_skipper_data(): SkipperData {
        return SkipperData{last_proposal_id: self.last_proposal_id};
    }

    // Returns JettonLock contract address for a given owner
    get fun get_lock_address(owner: Address): Address {
        let init = initOf JettonLock(owner, self.jetton_master);
        return contractAddress(init);
    }

    // Returns Jetton master address
    get fun get_jetton_master(): Address {
        return self.jetton_master;
    }
    
    // Returns Proposal contract address for a given proposal id
    get fun get_proposal_address(proposal_id: Int): Address {
        let init = initOf Proposal(myAddress(), proposal_id);
        return contractAddress(init);
    }
}