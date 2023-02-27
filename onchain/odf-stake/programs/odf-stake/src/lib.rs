use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    system_program,
    pubkey::Pubkey,
};
use std::time::{SystemTime,UNIX_EPOCH};
use anchor_spl::token::{self, Mint, TokenAccount, Transfer, MintTo};
use std::mem::size_of;
pub mod errors;
pub mod constant;
declare_id!("EqYPUiDkbgZTRJkbuoaEX6PytqYyx8RMEvaGqs99fMcE");

#[program]
pub mod odf_stake {
    use anchor_spl::token::Burn;
    use super::*;
    pub fn init(ctx: Context<Init>, bump: Bump) -> Result<()> {
        let ref mut vault = ctx.accounts.vault;
        vault.bump = bump.vault_bump;
        vault.mint_token = ctx.accounts.mint_token.key();
        vault.vault_token = ctx.accounts.vault_token.key();
        vault.vault_mint = ctx.accounts.vault_mint.key();
        vault.payer = ctx.accounts.payer.key();

        // set period and apy
        vault.min_lock_period = constant::MIN_LOCK_PERIOD;
        vault.max_lock_period = constant::MAX_LOCK_PERIOD;
        vault.apy = constant::BASE_APY;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64, period: u64) ->  Result<()>  {
        // check amount
        if amount < constant::MIN_AMOUNT{
            return Err(error!(errors::ErrorCode::InvalidAmount));
        }

        let ref vault = &ctx.accounts.vault;
        // check period
        if period < vault.min_lock_period || period > vault.max_lock_period{
            return Err(error!(errors::ErrorCode::InvalidPeriod));
        }

        // record stake info
        let ref mut staker_info = ctx.accounts.stake_info;
        let staker = ctx.accounts.depositor.to_account_info().clone();
        if staker_info.stake_list.len() > 0 {
            // foreach stake
            for stake in staker_info.stake_list.iter_mut(){
                let serial_number = stake.stake_data.len() as u64;
                let stake_data = StakeData{
                    stake_time: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
                    stake_amount: amount,
                    period: period,
                    apy: vault.apy,
                    is_claim_complete: false,
                    serial_number: serial_number + 1,
                };
                if stake.staker == staker.key() {
                    stake.stake_data.push(stake_data)
                } else {
                    stake.staker = staker.key();
                    stake.stake_data.push(stake_data)

                }
            }
        }

        // Transfer to vault_token
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor.to_account_info().clone(),
            to: ctx.accounts.vault_token.to_account_info().clone(),
            authority: ctx.accounts.owner.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        //Mint LP token for depositor
        let cpi_program = ctx.accounts.token_program.clone();
        let  signer_seeds = &[
            b"vault".as_ref(), 
            ctx.accounts.vault.mint_token.as_ref(),
            ctx.accounts.vault.payer.as_ref(),
            &[ctx.accounts.vault.bump],
        ];
        let signer = &[&signer_seeds[..]];
        let mint_to_ctx = CpiContext::new_with_signer(
                cpi_program,
                MintTo {
                mint: ctx.accounts.vault_mint.to_account_info().clone(),
                to:  ctx.accounts.user_vault.to_account_info().clone(),
                authority: ctx.accounts.vault.to_account_info().clone(),
                }, signer);
        token::mint_to(mint_to_ctx, amount)?;
        Ok(())
    }

    pub fn un_stake(ctx: Context<UnStake>, amount: u64, serial_number: u64) ->  Result<()>  {
        let ref mut stake_info = ctx.accounts.stake_info;
        let withdrawer = ctx.accounts.withdrawer.to_account_info().clone();
        if stake_info.stake_list.len() == 0 {
            return Err(error!(errors::ErrorCode::NotStake));
        }
        let mut has_stake_data = false;
        for stake in stake_info.stake_list.iter_mut() {
            if stake.staker == withdrawer.key() {
                for stake_data in stake.stake_data.iter_mut() {
                    if stake_data.serial_number == serial_number {
                        if stake_data.is_claim_complete {
                            return Err(error!(errors::ErrorCode::AlreadyClaimComplete))
                        }
                        has_stake_data = true;
                        let stake_time = stake_data.stake_time;
                        let stake_amount = stake_data.stake_amount;
                        let apy = stake_data.apy;
                        let period = stake_data.period;

                        // check stake amount
                        if amount > stake_amount {
                            return Err(error!(errors::ErrorCode::NotEnoughStakeAmount));
                        }
                        // calculate days
                        let days = (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() - stake_time)/86400;
                        let days =(days as f64).floor() as u64;
                        // check period
                        if days < period {
                            return Err(error!(errors::ErrorCode::NotInPeriod))
                        }
                        // calculate day apy
                        let day_rate: f64 = (apy / 36500) as f64;
                        // calculate interest
                        let interest:u64 = (amount as f64 * ((1 as f64 + day_rate).powf(days as f64))).floor() as u64 ;
                        let cpi_program = ctx.accounts.token_program.clone();
                        let signer_seeds = &[
                            b"vault".as_ref(), 
                            ctx.accounts.vault.mint_token.as_ref(),
                            ctx.accounts.vault.payer.as_ref(),
                            &[ctx.accounts.vault.bump],
                        ];
                        let signer = &[&signer_seeds[..]];
                        token::transfer(CpiContext::new_with_signer(
                            cpi_program,
                            Transfer {
                                from: ctx.accounts.vault_token.to_account_info().clone(),
                                to: ctx.accounts.withdrawer.to_account_info().clone(),
                                authority: ctx.accounts.vault.to_account_info().clone(),
                            }, signer), interest)?;

                        let cpi_program = ctx.accounts.token_program.clone();
                        token::burn(CpiContext::new(cpi_program, Burn {
                            authority: ctx.accounts.owner.clone(),
                            mint:ctx.accounts.vault_mint.to_account_info().clone(),
                            from: ctx.accounts.user_vault.to_account_info().clone(),
                        }), amount)?;

                        // update stake state
                        stake_data.is_claim_complete = true
                    }
                }
            }
        }

        if !has_stake_data {
            return Err(error!(errors::ErrorCode::NotStake));
        }
    
        Ok(())
    }
}



#[derive(AnchorSerialize, AnchorDeserialize, Eq, PartialEq, Clone, Copy, Debug)]
pub struct Bump {
    pub vault_bump: u8,
    pub token_bump: u8,
    pub mint_bump: u8,
}
#[derive(Accounts)]
pub struct Init<'info> {
    // For each token we have one vault
    #[account(
        init,
        seeds = [b"vault", mint_token.key().as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = size_of::<Vault>() + 8,
    )]
    pub vault:Account<'info, Vault>,
    #[account(
        init,
        seeds = [b"vault_token", mint_token.key().as_ref(), vault.key().as_ref()],
        bump,
        token::mint = mint_token,
        token::authority = vault,
        payer = payer,
    )]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(
        init, 
        seeds = [b"vault_mint", mint_token.key().as_ref(), vault.key().as_ref()],
        bump,
        mint::authority = vault,
        mint::decimals = mint_token.decimals,
        payer = payer,
    )]
    pub vault_mint: Account<'info, Mint>,
    pub mint_token: Account<'info, Mint>,
    /// CHECK:
    #[account(mut, signer)]
    pub payer: AccountInfo<'info>,
    /// CHECK: Struct field "system_program" is unsafe
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK:
    #[account(address = spl_token::ID)]
    pub token_program: AccountInfo<'info>,
}

#[account]
pub struct Vault {
    pub bump: u8,
    pub payer: Pubkey,
    pub mint_token: Pubkey,  // The token this vault keep
    pub vault_token: Pubkey, // PDA for this vault keep the token
    pub vault_mint: Pubkey,  // LP token mint
    pub min_lock_period: u64, // min period
    pub max_lock_period: u64, // max period
    pub apy: u64
}
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut, has_one = owner)]
    depositor: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault.mint_token == depositor.mint)]
    vault: Account<'info, Vault>,

    #[account(mut, constraint = vault_token.mint == vault.mint_token)]
    vault_token: Account<'info, TokenAccount>,

    #[account(mut)]
    vault_mint: Account<'info, Mint>,

    #[account(mut, constraint = user_vault.mint == vault.vault_mint)]
    user_vault: Account<'info, TokenAccount>,

    /// CHECK:
    #[account(signer)]
    owner: AccountInfo<'info>,
    /// CHECK:
    token_program: AccountInfo<'info>,

    #[account(mut)]
    stake_info: Account<'info, StakeInfo>
}


#[account]
pub struct StakeInfo {
    pub stake_list: Vec<StakeList>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct StakeList {
    pub staker: Pubkey,
    pub stake_data: Vec<StakeData>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct StakeData{
    pub period: u64, // period
    pub stake_time: u64 ,// stake time
    pub stake_amount: u64,
    pub apy: u64,
    pub serial_number: u64,
    pub is_claim_complete: bool,
}

#[derive(Accounts)]
pub struct UnStake<'info> {
    #[account(mut, has_one = owner)]
    withdrawer: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault.mint_token == withdrawer.mint)]
    vault: Account<'info, Vault>,

    #[account(mut, constraint = vault_token.mint == vault.mint_token)]
    vault_token: Account<'info, TokenAccount>,

    #[account(mut)]
    vault_mint: Account<'info, Mint>,

    #[account(mut, constraint = user_vault.mint == vault.vault_mint)]
    user_vault: Account<'info, TokenAccount>,
    /// CHECK:
    #[account(signer)]
    owner: AccountInfo<'info>,
    /// CHECK:
    #[account()]
    token_program: AccountInfo<'info>,

    #[account(mut)]
    stake_info: Account<'info, StakeInfo>
}
