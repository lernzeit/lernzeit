// Stripe Price IDs for LernZeit Premium
// These must match the prices configured in the Stripe Dashboard.
// Monthly: 2,99 €/Monat | Yearly: 29,99 €/Jahr
export const STRIPE_MONTHLY_PRICE_ID = 'price_1Ts1oYH54M7FMLTcAtI2CuNB';

// Produkt "LernZeit Premium (Jährlich)" – 29,99 €/Jahr
export const STRIPE_YEARLY_PRICE_ID = 'price_1Ts2FAH54M7FMLTcrmJ1dKWi';

// Anzeigetexte fuer die Web-Oberflaeche. Im Web wird ueber Stripe Checkout
// abgerechnet, NICHT ueber RevenueCat — der angezeigte Preis muss deshalb aus
// derselben Quelle stammen wie die Belastung. Aendert sich der Preis in
// Stripe, gehoert er hier mit geaendert.
export const STRIPE_MONTHLY_PRICE_LABEL = '2,99 €';
export const STRIPE_YEARLY_PRICE_LABEL = '29,99 €';
