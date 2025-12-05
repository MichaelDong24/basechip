import { base } from '@base-org/account'

export async function Payment(amount: string, to: string) {
  try {
    const result = await base.pay({
      amount: amount,
      to: to,
      testnet: false
    })
    
    return result;
  } catch (error) {
    throw error;
  }
}