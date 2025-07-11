#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, MintTo, mint_to, SetAuthority, set_authority, TransferChecked, transfer_checked, Burn, burn}};

declare_id!("FqzkXZdwYjurnUKetJCAvaUw5WAqbwzU6gZEwydeEfqS");

#[constant]
pub const MINT_SEED: &[u8] = b"mint";
pub const LISTING_SEED: &[u8] = b"listing";
pub const VAULT_SEED: &[u8] = b"vault";
pub const ANCHOR_DISCRIMINATOR: usize = 8;

#[program]
pub mod counter {
    use super::*;

    pub fn create_listing(ctx: Context<List>, seed: u64, name: String) -> Result<()> {
        ctx.accounts.listing.set_inner(Listing { 
            name, 
            seed, 
            mint: ctx.accounts.mint.key(), 
            funding_goal: 350, 
            pool_mint_supply: 0, 
            funding_raised: 800_000, 
            available_tokens: 200_000, 
            base_price: 0.001, 
            tokens_sold: 0, 
            bump: ctx.bumps.listing, 
            vault_bump: ctx.bumps.sol_vault, 
            mint_bump: ctx.bumps.mint
        });

        //TODO: add fee
        let total_supply = ctx.accounts.listing.available_tokens.checked_add(ctx.accounts.listing.pool_mint_supply).unwrap();

        let amount_to_mint = total_supply * 10u64.pow(ctx.accounts.mint.decimals as u32) as u128;

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.mint_vault.to_account_info(),
            authority: ctx.accounts.listing.to_account_info()
        };
        // let listing = ctx.accounts.listing;
        let seeds = &[
            b"listing"[..],
            &ctx.accounts.listing.seed.to_le_bytes(),
            &[ctx.accounts.listing.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(
            cpi_program.clone(), 
            accounts, 
            signer_seeds
        );
        mint_to(ctx, amount_to_mint as u64)?;

        let accounts = SetAuthority {
            account_or_mint: ctx.accounts.mint.to_account_info(),
            current_authority: ctx.accounts.listing.to_account_info()
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, accounts, signer_seeds);
        set_authority(cpi_ctx, spl_token_2022::instruction::AuthorityType::MintTokens, None)?;

        Ok(())
    }

    pub fn buy(ctx: Context<Swap>, amount: u128) -> Result<()> {
        let total_cost = BondingCurve::calculate_price_fixed(amount, ctx.accounts.listing.available_tokens, ctx.accounts.listing.base_price);
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.sol_vault.to_account_info()
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, total_cost as u64)?;

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.mint_vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        let seeds = &[
            LISTING_SEED,
            &ctx.accounts.listing.seed.to_le_bytes(),
            &[ctx.accounts.listing.bump]
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        transfer_checked(cpi_ctx, amount as u64, ctx.accounts.mint.decimals)?;

        ctx.accounts.listing.available_tokens = ctx.accounts.listing.available_tokens.checked_sub(amount / 10_u64.pow(6) as u128).unwrap();
        ctx.accounts.listing.tokens_sold = ctx.accounts.listing.tokens_sold.checked_add(amount).unwrap();
        Ok(())
    }

    pub fn sell(ctx: Context<Swap>, amount: u128) -> Result<()> {
        //TODO: Add checks
        //TODO: add slippage
        let total_value = BongingCurve::calculate_price_fixed(amount, ctx.accounts.listing.available_tokens, ctx.accounts.listing.base_price);

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.user_ata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.mint_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info()
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer_checked(cpi_ctx, amount as u64, ctx.accounts.mint.decimals)?;

        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.sol_vault.to_account_info(),
            to: ctx.accounts.user.to_account_info()
        };
        let seeds = &[
            VAULT_SEED,
            &ctx.accounts.listing.seed.to_be_bytes(),
            &[ctx.accounts.listing.vault_bump]
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        transfer(cpi_ctx, total_value as u64)?;

        ctx.accounts.listing.available_tokens = ctx.accounts.listing.available_tokens.checked_add(amount / 10_u64.pow(6) as u128).unwrap();
        ctx.accounts.listing.tokens_sold = ctx.accounts.listing.tokens_sold.checked_sub(amount).unwrap();

        Ok(())
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.user_ata.to_account_info(),
            authority: ctx.accounts.user.to_account_info()
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        burn(cpi_ctx, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct List<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        seeds = [MINT_SEED, seed.to_le_bytes().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = listing,
        mint::token_program = token_program
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = signer,
        seeds = [LISTING_SEED, seed.to_le_bytes().as_ref()],
        bump,
        space = ANCHOR_DISCRIMINATOR + Listing::INIT_SPACE
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = listing,
        associated_token::token_program = token_program
    )]
    pub mint_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        seeds = [VAULT_SEED, seed.to_le_bytes().as_ref()],
        bump
    )]
    pub sol_vault: SystemAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [MINT_SEED, listing.seed.to_le_bytes().as_ref()],
        bump = listing.mint_bump,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [VAULT_SEED, listing.seed.to_le_bytes().as_ref()],
        bump = listing.vault_bump
    )]
    pub sol_vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [LISTING_SEED, listing.seed.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing
    )]
    pub mint_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    user: Signer<'info>,
    #[account(
        mut,
        seeds = [MINT_SEED, listing.seed.to_le_bytes().as_ref()],
        bump = listing.mint_bump,
    )]
    mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [VAULT_SEED, listing.seed.to_be_bytes().as_ref()],
        bump = listing.vault_bump
    )]
    sol_vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [LISTING_SEED, listing.seed.to_le_bytes().as_ref()],
        bump = listing.bump,
    )]
    listing: Account<'info, Listing>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    mint_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    user_ata: InterfaceAccount<'info, TokenAccount>,

    token_program: Interface<'info, TokenInterface>,
    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct BongingCurve;
impl BongingCurve {
    fn calculate_price_original(&self, amount: u128, initial_supply: u128, base_price: f64) -> f64 {
        let remaining_supply = initial_supply.saturating_sub(amount);
        let supply_ratio = remaining_supply as f64 / initial_supply as f64;
        let k = 20.0;
        let e = std::f64::consts::E;
        let exponent = k * (1.0 - supply_ratio);
        base_price * e.powf(exponent)
    }

    pub fn calculate_price_fixed(amount: u128, available_tokens: u128, base_price: f64) -> f64 {
        let initial_supply = available_tokens;
        let current_supply = initial_supply - available_tokens;

        let mut total_cost = 0.0;
        let steps = 10;
        let amount_per_step = amount / steps as u128;

        for i in 0..steps {
            let current_amount = current_supply + (i as u128 * amount_per_step);
            let step_price = Self.calculate_price_original(current_amount, initial_supply, base_price);
            total_cost += step_price * (amount_per_step as f64 / 1_000_000.0);
        }

        total_cost
    }
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    #[max_len(32)]
    pub name: String,
    pub seed: u64,
    pub mint: Pubkey,
    pub funding_goal: u64,
    pub pool_mint_supply: u128,
    pub funding_raised: u64,
    pub available_tokens: u128,
    pub base_price: f64,
    pub tokens_sold: u128,
    pub bump: u8,
    pub vault_bump: u8,
    pub mint_bump: u8
}

#[error_code]
pub enum PumpError {
    #[msg("Invalid Amount - it should be greater than 0")]
    InvalidAmount,
    #[msg("Invalid Tokens")]
    InsufficientTokens,
    #[msg("Calculation Error")]
    CalculationError,
    #[msg("Already Minted")]
    AlreadyMinted,
    #[msg("Overflow")]
    Overflow,
    #[msg("Math Overflow")]
    MathOverflow,
    #[msg("Invalid Calculation")]
    InvalidCalculation,
}