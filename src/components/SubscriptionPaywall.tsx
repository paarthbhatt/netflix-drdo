import React, { useState } from 'react';
import { Check, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';
import { UserAccount } from '../types';

interface SubscriptionPaywallProps {
  userEmail: string;
  userAccount: UserAccount | null;
}

type PlanType = 'Mobile' | 'Standard' | 'Premium';
type CycleType = 'monthly' | 'yearly';

const PLANS = {
  Mobile: {
    monthly: 6.99,
    yearly: 66.99,
    resolution: '480p',
    devices: 1,
    quality: 'Good',
  },
  Standard: {
    monthly: 15.49,
    yearly: 148.99,
    resolution: '1080p',
    devices: 2,
    quality: 'Great',
  },
  Premium: {
    monthly: 22.99,
    yearly: 219.99,
    resolution: '4K + HDR',
    devices: 4,
    quality: 'Best',
  },
};

export default function SubscriptionPaywall({ userEmail }: SubscriptionPaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('Standard');
  const [billingCycle, setBillingCycle] = useState<CycleType>('monthly');
  const [step, setStep] = useState<1 | 2>(1); // 1: Choose Plan, 2: Credit Card Checkout

  // Checkout inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');


  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9/]/g, '');
    if (value.length === 2 && !value.includes('/')) {
      value = value + '/';
    }
    if (value.length > 5) return;
    setCardExpiry(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 4) return;
    setCardCvv(value);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('Subscription provisioning is handled by a trusted backend workflow.');
  };

  const planPrice = PLANS[selectedPlan][billingCycle];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-12" id="paywall-container">
      <div className="w-full max-w-lg bg-[#141414] border border-[#222] rounded-xl p-8 shadow-2xl transition-all duration-300">
        
        {/* Step Header */}
        <div className="mb-8 text-center">
          <div className="text-red-600 font-bold tracking-widest text-xs uppercase mb-2">
            STEP {step} OF 2
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">
            {step === 1 ? 'Choose the plan that’s right for you' : 'Set up your credit card'}
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-sm mx-auto">
            {step === 1 
              ? 'Downgrade, upgrade, or cancel at any time. No hidden contracts.' 
              : `Safe and secure payment gateway powered by standard 256-bit SSL.`}
          </p>
        </div>

        {step === 1 ? (
          /* STEP 1: Plan Picker */
          <div>
            {/* Interval Selector Toggle */}
            <div className="flex bg-[#222] p-1 rounded-full mb-8 max-w-xs mx-auto">
              <button 
                id="billing-cycle-monthly"
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${billingCycle === 'monthly' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                Monthly Billing
              </button>
              <button 
                id="billing-cycle-yearly"
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 py-1 px-3 text-xs font-semibold rounded-full transition-all flex items-center justify-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                Yearly Billing 
                <span className="bg-green-950 text-green-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Save 20%</span>
              </button>
            </div>

            {/* Plans List Cards */}
            <div className="space-y-4 mb-8">
              {(Object.keys(PLANS) as PlanType[]).map((planName) => {
                const isSelected = selectedPlan === planName;
                const pl = PLANS[planName];
                const price = pl[billingCycle];
                return (
                  <div 
                    key={planName}
                    id={`plan-card-${planName.toLowerCase()}`}
                    onClick={() => setSelectedPlan(planName)}
                    className={`border rounded-xl p-5 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-red-600 bg-red-950/20 shadow-lg' : 'border-[#2ea] hover:border-gray-600 bg-[#1c1c1c]'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-red-600 bg-red-600' : 'border-gray-500 bg-transparent'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white font-sans">{planName}</h3>
                        <p className="text-gray-400 text-xs mt-1">
                          {pl.resolution} resolution • {pl.devices} Active Screens
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-white">
                        ${price}
                      </div>
                      <div className="text-gray-500 text-[10px]">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Features list */}
            <div className="space-y-3 p-4 bg-[#1a1a1a] rounded-xl border border-[#222] mb-8">
              <div className="flex items-start gap-2.5 text-sm">
                <Check className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-gray-300">Unlimited access to blockbuster digital streaming movies.</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <Check className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-gray-300">Watch on your TV, phone, tablet, computer, or media stick.</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <Check className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-gray-300">No cancellation fees, switch plans instantly anytime.</span>
              </div>
            </div>

            {/* Go to payment */}
            <button
              id="continue-to-payment"
              onClick={() => setStep(2)}
              className="w-full bg-red-600 hover:bg-red-700 font-sans font-semibold text-white py-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow hover:scale-[1.01] transition-transform"
            >
              <CreditCard className="w-5 h-5" />
              Continue to Payment Setup (${planPrice})
            </button>
          </div>
        ) : (
          /* STEP 2: Credit Card Checkout Form */
          <form onSubmit={handleCheckoutSubmit} className="space-y-5" id="billing-form">
            
            {/* Plan summary mini card */}
            <div className="bg-[#1c1c1c] p-4 rounded-lg border border-[#222] flex items-center justify-between text-sm">
              <div>
                <span className="font-bold text-white">{selectedPlan} Plan</span>
                <span className="text-gray-400 capitalize"> ({billingCycle})</span>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="block text-red-500 hover:underline text-xs mt-0.5"
                >
                  Change plan
                </button>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-white text-lg">${planPrice}</span>
                <span className="text-gray-500 block text-[10px]">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-500/50 text-red-200 text-xs px-4 py-3 rounded-md mb-4" id="checkout-error">
                {errorMsg}
              </div>
            )}

            {/* Form details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Cardholder Name
                </label>
                <input
                  id="card-name-input"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full bg-[#333] border border-transparent focus:border-gray-500 rounded px-4 py-3 text-white placeholder-gray-500 font-sans text-sm focus:outline-none focus:ring-0 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Credit Card Number
                </label>
                <div className="relative">
                  <input
                    id="card-number-input"
                    type="text"
                    required
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full bg-[#333] border border-transparent focus:border-gray-500 rounded pl-11 pr-4 py-3 text-white placeholder-gray-500 font-sans tracking-widest text-sm focus:outline-none focus:ring-0 transition-colors"
                  />
                  <CreditCard className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Expiration Date
                  </label>
                  <input
                    id="card-expiry-input"
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    className="w-full bg-[#333] border border-transparent focus:border-gray-500 rounded px-4 py-3 text-white placeholder-gray-500 font-sans text-sm text-center focus:outline-none focus:ring-0 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    CVV Code
                  </label>
                  <input
                    id="card-cvv-input"
                    type="password"
                    required
                    placeholder="•••"
                    value={cardCvv}
                    onChange={handleCvvChange}
                    className="w-full bg-[#333] border border-transparent focus:border-gray-500 rounded px-4 py-3 text-white placeholder-gray-500 font-sans text-sm text-center focus:outline-none focus:ring-0 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Bottom warning badge */}
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4.5 h-4.5 text-green-500 shrink-0 mt-0.5" />
              <span>
                By pressing Pay, your trial will begin immediately. You may cancel online at any time via the account panel with single-click reactivation safeguards.
              </span>
            </div>

            {/* CTA button */}
            <div className="flex gap-3 pt-2">
              <button
                id="back-to-plan-selection"
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-[#2a2a2a] hover:bg-[#333] text-white py-4 rounded font-semibold text-sm transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                id="submit-payment"
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 bg-red-600 hover:bg-red-700 py-4 rounded font-sans font-bold text-white text-sm flex items-center justify-center gap-2 cursor-pointer shadow hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Completing Purchase...
                  </>
                ) : (
                  `Pay $${planPrice}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="w-full max-w-lg mt-6 bg-[#0c0c0c] border border-neutral-800 rounded-xl p-5 shadow-lg text-neutral-300">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <h2 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider">
            Trusted Entitlement Workflow
          </h2>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
          Subscription status is now read-only on the client. Entitlements must come from Firestore data validated by backend policy, and direct browser writes are disabled.
        </p>
      </div>
    </div>
  );
}
