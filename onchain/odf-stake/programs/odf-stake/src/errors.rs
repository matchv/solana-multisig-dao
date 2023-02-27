use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("amount is too small")]
    InvalidAmount,

    #[msg("Invalid period")]
    InvalidPeriod,

    #[msg("The lock-up period is not reached")]
    NotInPeriod,

    #[msg("stake amount not enough")]
    NotEnoughStakeAmount,

    #[msg("not staked")]
    NotStake,

    #[msg("already claim complete")]
    AlreadyClaimComplete,
}
