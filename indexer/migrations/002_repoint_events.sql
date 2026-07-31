-- 002_repoint_events.sql
-- Repoint the event store at the real on-chain event sources.
--
-- There is NO on-chain "x402 facilitator contract": the Built-on-Stellar
-- x402 facilitator is an off-chain service (OpenZeppelin Relayer + x402
-- Facilitator Plugin). Settlements surface on-chain as SEP-41 token
-- `transfer` events on the monitored asset contract, and as OpenZeppelin
-- smart-account `spending_limit_enforced` events. The old
-- facilitator_contract_id column is therefore renamed to source_contract_id
-- to reflect that it stores whichever contract emitted the event.

ALTER TABLE settlement_events
    RENAME COLUMN facilitator_contract_id TO source_contract_id;
