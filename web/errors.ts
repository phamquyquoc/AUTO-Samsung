export const messages = {
    'login.from.cart.empty.not.navigated.back.to.cart': 'Not navigated back to cart page after login from empty cart page',
    'login.from.splash.not.navigated.to.checkout': 'Not navigated to checkout after signing in from splash page',
    'bc.tradeIn.add.error': 'Failed to add Trade In on BC page',
    'bc.tradeIn.add.again.error': 'Failed to add Trade In again on BC page',
    'bc.scp.add.error': 'Failed to add SC+ on BC page',
    'bc.scp.add.again.error': 'Failed to add SC+ again on BC page',
    'pd.tradeIn.add.error': 'Failed to add Trade In on PD page',
    'pd.tradeIn.add.again.error': 'Failed to add Trade In again on PD page',
    'pd.scp.add.error': 'Failed to add SC+ on PD page',
    'pd.scp.add.again.error': 'Failed to add SC+ again on PD page',
    'cart.load.error': 'Cart loading error',
}

export type Errors = typeof messages & Record<string, string>;