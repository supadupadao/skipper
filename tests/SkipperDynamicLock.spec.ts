import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import '@ton/test-utils';
import { JettonMaster } from './JettonMaster';
import { JettonWallet } from './JettonWallet';
import { JettonLock } from '../wrappers/Lock';
import { Proposal } from '../wrappers/Proposal';
import { EXIT_CODES, LOCK_INTERVAL, LOCK_MIN_INTERVAL ,  OP_CODES } from './constants';

describe('Initializing proposals tests with dynamic lock', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let skipper: SandboxContract<Skipper>;
    let lock: SandboxContract<JettonLock>;
    let proposal: SandboxContract<Proposal>;

    async function runCreateProposalTest(lock_period: bigint | null, expectedLockInterval: number): Promise<void> {
        //random number to test the payload at ProposalData
        var random = Math.floor(Math.random() * 900000);

        // Set the current time
        let startTime = Math.floor(Date.now() / 1000);
        blockchain.now = startTime;

        const createProposalResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                lock_period: lock_period,
                payload: beginCell()
                .storeUint(OP_CODES.RequestNewProposal, 32)
                .storeAddress(deployer.address)                
                .storeRef(
                     beginCell()
                    .storeUint(random, 256)
                    .endCell())
                .asCell(),
            }
        );

        expect(createProposalResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: OP_CODES.SendProxyMessage,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: lock.address,
            to: skipper.address,
            success: true,
            op: OP_CODES.ProxyMessage,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.InitProposal,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: proposal.address,
            // to: voter.address,
            success: true,
            op: OP_CODES.InitVoter,
        });

        // Check the proposal data
        const proposalData = await proposal.getGetProposalData();
        expect(proposalData?.receiver.toString()).toEqual(deployer.address.toString());

        // Decode the body of ProposalData
        const proposalDataSlice = proposalData!.body.beginParse();
        const randomInt = proposalDataSlice.loadUint(256);
        expect(randomInt).toEqual(random);

        //check the expiry date for the proposal
        const expiresAt = await proposal.getExpiresAt();
        expect(expiresAt).toEqual(BigInt(blockchain.now + expectedLockInterval));
    }
    
    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        jetton_master = blockchain.openContract(await JettonMaster.fromInit(deployer.address));
        jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, deployer.address));
        skipper = blockchain.openContract(await Skipper.fromInit(jetton_master.address));
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_master.address));
        proposal = blockchain.openContract(await Proposal.fromInit(skipper.address, 1n));

        const deployResult = await skipper.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: skipper.address,
            deploy: true,
            success: true,
        });

        await jetton_master.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'JettonMint',
                query_id: 0n,
                amount: toNano('1337000'),
                destination: deployer.address,
            }
        );
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('1337000'));

        await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.05')
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("1337000"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: beginCell().asSlice(),
                forward_ton_amount: toNano("0.05"),
                response_destination: lock.address,
            }
        );
        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('1337000'));
    });

    it('should create proposal with the default LOCK_INTERVAL', async () => {
        await runCreateProposalTest(BigInt(LOCK_INTERVAL),LOCK_INTERVAL);
    });

    it('should create proposal with the default LOCK_INTERVAL with null lock_period ', async () => {
        await runCreateProposalTest(null, LOCK_INTERVAL );
    });

    it('should create proposal with the default LOCK_INTERVAL with 0 lock_period ', async () => {
        await runCreateProposalTest(BigInt(0), LOCK_INTERVAL );
    });

    it('should try to create proposal with lock_period less than the LOCK_MIN_INTERVAL ', async () => {
        await runCreateProposalTest(BigInt(5), LOCK_MIN_INTERVAL );
    });

    it('should create proposal with lock_period less than the LOCK_INTERVAL ', async () => {
        // create proposal that is less than the LOCK_INTERVAL but greater than the LOCK_MIN_INTERVAL
        await runCreateProposalTest(BigInt(LOCK_MIN_INTERVAL + 5), LOCK_MIN_INTERVAL + 5 );
    });

    it('should create proposal with lock_period greater than the LOCK_INTERVAL ', async () => {
        await runCreateProposalTest(BigInt(LOCK_INTERVAL + 5), LOCK_INTERVAL + 5 );
    });
});


describe('Particibating in proposals tests with dynamic lock', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let user2_jetton_wallet: SandboxContract<JettonWallet>;
    let skipper: SandboxContract<Skipper>;
    let lock: SandboxContract<JettonLock>;
    let user2_lock: SandboxContract<JettonLock>;
    let proposal: SandboxContract<Proposal>;
    let proposal2: SandboxContract<Proposal>;

    
    beforeEach(async () => {
        blockchain = await Blockchain.create();

        // Set the current time
        let startTime = Math.floor(Date.now() / 1000);
        blockchain.now = startTime;

        deployer = await blockchain.treasury('deployer');
        user2 = await blockchain.treasury('user2');

        jetton_master = blockchain.openContract(await JettonMaster.fromInit(deployer.address));
        jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, deployer.address));
        user2_jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, user2.address));

        skipper = blockchain.openContract(await Skipper.fromInit(jetton_master.address));
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_master.address));
        user2_lock = blockchain.openContract(await JettonLock.fromInit(user2.address, jetton_master.address));
        proposal = blockchain.openContract(await Proposal.fromInit(skipper.address, 1n));
        proposal2 = blockchain.openContract(await Proposal.fromInit(skipper.address, 2n));


        //Setup user1 (deployer) accounts 
       //==========================================
        await jetton_master.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'JettonMint',
                query_id: 0n,
                amount: toNano('1337000'),
                destination: deployer.address,
            }
        );
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('1337000'));      

        await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.05')
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );        

        await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("1337000"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: beginCell().asSlice(),
                forward_ton_amount: toNano("0.05"),
                response_destination: lock.address,
            }
        );

        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('1337000'));        

        //Setup user2 (deployer) accounts 
        //==========================================
        await jetton_master.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'JettonMint',
                query_id: 0n,
                amount: toNano('1337000'),
                destination: user2.address,
            }
        );
        const jettonWalletUser2Data = await user2_jetton_wallet.getGetWalletData();
        expect(jettonWalletUser2Data.balance).toEqual(toNano('1337000'));      

        await user2_lock.send(
            user2.getSender(),
            {
                value: toNano('0.05')
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );        

        await user2_jetton_wallet.send(
            user2.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("1337000"),
                destination: user2_lock.address,
                custom_payload: null,
                forward_payload: beginCell().asSlice(),
                forward_ton_amount: toNano("0.05"),
                response_destination: user2_lock.address,
            }
        );

        const lockUser2Data = await user2_lock.getGetLockData();
        expect(lockUser2Data.amount).toEqual(toNano('1337000'));

        //Setup Skipper
        //==========================================
        const deployResult = await skipper.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: skipper.address,
            deploy: true,
            success: true,
        });


        //Setup proposal with deployer as the intiator
        //==========================================
        var random = Math.floor(Math.random() * 900000);
        const createProposalResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                lock_period: BigInt(LOCK_INTERVAL),
                payload: beginCell()
                .storeUint(OP_CODES.RequestNewProposal, 32)
                .storeAddress(deployer.address)                
                .storeRef(
                     beginCell()
                    .storeUint(random, 256)
                    .endCell())
                .asCell(),
            }
        );

        expect(createProposalResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: OP_CODES.SendProxyMessage,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: lock.address,
            to: skipper.address,
            success: true,
            op: OP_CODES.ProxyMessage,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.InitProposal,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: proposal.address,
            // to: voter.address,
            success: true,
            op: OP_CODES.InitVoter,
        });

        // Check the proposal data
        const proposalData = await proposal.getGetProposalData();
        expect(proposalData?.receiver.toString()).toEqual(deployer.address.toString());

        // Decode the body of ProposalData
        const proposalDataSlice = proposalData!.body.beginParse();
        const randomInt = proposalDataSlice.loadUint(256);
        expect(randomInt).toEqual(random);

        //check the expiry date for the proposal
        const expiresAt = await proposal.getExpiresAt();
        expect(expiresAt).toEqual(BigInt(blockchain.now + LOCK_INTERVAL));
    });

    //Runs the vote proposal votes for user2
    async function runVoteProposalTest(lock_period: bigint | null , proposalId: bigint = 1n): Promise<any> {
        const voteProposalResult = await user2_lock.send(
            user2.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                lock_period: lock_period,
                payload: beginCell()
                    .storeUint(OP_CODES.VoteForProposal, 32)
                    .storeUint(proposalId, 64)
                    .storeUint(1, 1)
                    .asCell(),
            }
        );
        expect(voteProposalResult.transactions).toHaveTransaction({
            from: user2.address,
            to: user2_lock.address,
            success: true,
            op: OP_CODES.SendProxyMessage,
        });
        expect(voteProposalResult.transactions).toHaveTransaction({
            from: user2_lock.address,
            to: skipper.address,
            success: true,
            op: OP_CODES.ProxyMessage,
        });

        expect(voteProposalResult.transactions).toHaveTransaction({
            from: skipper.address,
            // to: voter.address,
            success: true,
            op: OP_CODES.UpdateVoterBalance,
        });
  
        return voteProposalResult
    }

    it('should participate on a proposal with the default lock_period value LOCK_INTERVAL', async () => {
        let voteProposalResult = await runVoteProposalTest(BigInt(LOCK_INTERVAL));

        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.UpdateVotes,
        });      
    });

    it('should try to participate on a proposal lock_period value 0', async () => {
        let voteProposalResult =  await runVoteProposalTest(BigInt(0));

        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.UpdateVotes,
            exitCode: EXIT_CODES.UnlockDateInsufficient
        });      
    });

    it('should try to participate on a proposal with lock_period value null', async () => {
        let voteProposalResult =  await runVoteProposalTest(null);

        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.UpdateVotes,
            exitCode: EXIT_CODES.UnlockDateInsufficient
        });      
    });

    it('should try participate on a proposal with lock_period value not sufficient for the proposal', async () => {
        let voteProposalResult =  await runVoteProposalTest(5n);

        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.UpdateVotes,
            exitCode: EXIT_CODES.UnlockDateInsufficient
        });      
    });
    
    it('should participate on a proposal with lock_period value that spans more than the proposal expiry', async () => {
        let voteProposalResult =  await runVoteProposalTest(BigInt(LOCK_INTERVAL) + 5n);

        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.UpdateVotes,
        });      
        
    });

    it('should participate on 2 proposals', async () => {
        let voteProposalResult =  await runVoteProposalTest(BigInt(LOCK_INTERVAL) + 5n);

        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.UpdateVotes,
        });      

        //Create another proposal from user1 (deployer)
        var random = Math.floor(Math.random() * 900000);
        await lock.send(
            deployer.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                lock_period: BigInt(LOCK_INTERVAL),
                payload: beginCell()
                .storeUint(OP_CODES.RequestNewProposal, 32)
                .storeAddress(deployer.address)                
                .storeRef(
                    beginCell()
                    .storeUint(random, 256)
                    .endCell())
                .asCell(),
            }
        );

        //Try to participate as user 2
        let voteProposalResult2 =  await runVoteProposalTest(BigInt(LOCK_INTERVAL), 2n);

        expect(voteProposalResult2.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal2.address,
            success: true,
            op: OP_CODES.UpdateVotes,
        });     
    });

    it('should participate on 2 proposals without sufficient locking on the second', async () => {
        let voteProposalResult =  await runVoteProposalTest(BigInt(LOCK_INTERVAL) + 5n);

        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.UpdateVotes,
        });      

        //Create another proposal from user1 (deployer)
        var random = Math.floor(Math.random() * 900000);
        await lock.send(
            deployer.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                lock_period: BigInt(LOCK_INTERVAL),
                payload: beginCell()
                .storeUint(OP_CODES.RequestNewProposal, 32)
                .storeAddress(deployer.address)                
                .storeRef(
                    beginCell()
                    .storeUint(random, 256)
                    .endCell())
                .asCell(),
            }
        );

        //Try to participate as user 2
        let voteProposalResult2 =  await runVoteProposalTest(null, 2n);

        expect(voteProposalResult2.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal2.address,
            success: true,
            op: OP_CODES.UpdateVotes
        });     
    });
});

