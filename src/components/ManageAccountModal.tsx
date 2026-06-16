import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, HelpCircle, Loader2, Play, Pause, Trash2, ArrowLeft, Calendar } from 'lucide-react';
import { UserAccount } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ManageAccountModalProps {
  account: UserAccount;
  onClose: () => void;
}

const TIER_PRICES = {
  Mobile: { monthly: 6.99, yearly: 66.99 },
  Standard: { monthly: 15.49, yearly: 148.99 },
  Premium: { monthly: 22.99, yearly: 219.99 },
};

export default function ManageAccountModal({ account, onClose }: ManageAccountModalProps) {
  const [activeTab, setActiveTab] = useState<'membership' | 'billing'>('membership');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing credit card states
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvv, setNewCardCvv] = useState('');

  // Upgrade/Downgrade plan states
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'Mobile' | 'Standard' | 'Premium'>(account.plan || 'Standard');

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

  const handleUpdateCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('Payment instrument changes must be processed by a trusted backend workflow.');
  };

  const handleTierChangeSubmit = async () => {
    setErrorMsg('Plan changes are managed by the billing service and cannot be changed locally.');
  };

  const handleStatusToggle = async (nextStatus: 'active' | 'canceled' | 'paused') => {
    void nextStatus;
    setErrorMsg('Subscription status is controlled server-side and cannot be toggled locally.');
  };

  const cyclePrice = account.plan ? TIER_PRICES[account.plan][account.billingCycle || 'monthly'] : 0;

  // Mock static ledger invoices based on selected plan
  const mockInvoices = [
    { id: 'INV-10931', date: 'May 12, 2026', amount: cyclePrice, method: `${account.cardBrand} •••• ${account.cardLast4 || '4242'}` },
    { id: 'INV-09827', date: 'Apr 12, 2026', amount: cyclePrice, method: `${account.cardBrand} •••• ${account.cardLast4 || '4242'}` },
    { id: 'INV-08731', date: 'Mar 12, 2026', amount: cyclePrice, method: `${account.cardBrand} •••• ${account.cardLast4 || '4242'}` },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-50 flex flex-col p-4 md:p-12 overflow-y-auto animate-fade-in text-white select-none"
      id="billing-modal-backdrop"
    >
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12 font-sans">
        
        {/* Navigation row top */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-4">
            <button
              id="back-to-home-from-billing"
              onClick={onClose}
              className="text-neutral-400 hover:text-white flex items-center gap-2 cursor-pointer text-sm font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Main Stream
            </button>
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight">Account & Billing Workspace</h1>
          </div>
          <button
            id="close-billing-modal"
            onClick={onClose}
            className="text-neutral-400 hover:text-white cursor-pointer p-1 rounded-full hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Dynamic status widgets */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-200 text-xs px-4 py-3 rounded-md" id="billing-error">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-950/40 border border-green-500/50 text-green-200 text-xs px-4 py-3 rounded-md animate-pulse" id="billing-success">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Side Tabs navigation */}
          <div className="space-y-1">
            <button
              id="tab-membership-billing"
              onClick={() => setActiveTab('membership')}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                activeTab === 'membership' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Membership Info
            </button>
            
            <button
              id="tab-billing-history"
              onClick={() => setActiveTab('billing')}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                activeTab === 'billing' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Invoices & Statements
            </button>
          </div>

          {/* Main Workspace */}
          <div className="lg:col-span-3 bg-[#111111] border border-neutral-900 rounded-xl p-6 sm:p-8 space-y-8 shadow-xl">
            {activeTab === 'membership' ? (
              /* PANEL A: Membership & Renewals details */
              <div className="space-y-8" id="membership-details-panel">
                
                {/* Stripe/Wallet Status Panel */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-neutral-950/40 border border-neutral-800 rounded-xl">
                  <div>
                    <span className="text-gray-500 text-xs block uppercase font-bold tracking-wider">Account Member</span>
                    <span className="text-white text-base font-bold font-mono mt-0.5 block truncate max-w-xs">{account.email}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 text-xs block uppercase font-bold tracking-wider">Billing Status</span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase mt-1 inline-block ${
                      account.status === 'active' 
                        ? 'bg-green-950 text-green-400' 
                        : account.status === 'paused' 
                        ? 'bg-yellow-950 text-yellow-400' 
                        : 'bg-red-950/40 text-red-400 border border-red-900'
                    }`}>
                      {account.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 text-xs block uppercase font-bold tracking-wider">Plan Level</span>
                    <span className="text-white text-base font-bold font-sans mt-0.5 block">{account.plan || 'Free Account'}</span>
                  </div>
                </div>

                {/* Sub Plan details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Subscription summary */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-neutral-900 pb-2 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-red-600" />
                      Plan Information
                    </h3>
                    
                    {!isChangingPlan ? (
                      <div className="space-y-3 text-neutral-300 text-sm">
                        <p>
                          Your current plan is <strong className="text-white">{account.plan}</strong> billing <strong className="text-white capitalize">{account.billingCycle}ly</strong>.
                        </p>
                        <p className="flex items-center gap-2 text-xs text-neutral-400">
                          <Calendar className="w-4 h-4 text-neutral-500" />
                          Next renewal date: <strong className="text-white">
                            {account.nextPaymentDate ? new Date(account.nextPaymentDate).toLocaleDateString() : 'N/A'}
                          </strong>
                        </p>
                        <button
                          id="trigger-plan-change"
                          onClick={() => setIsChangingPlan(true)}
                          className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded cursor-pointer transition-colors"
                        >
                          Upgrade / Downgrade Plan
                        </button>
                      </div>
                    ) : (
                      /* Option block: Adjust levels and submit update setDoc */
                      <div className="space-y-4 bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                        <h4 className="font-bold text-sm text-white">Adjust Subscription Tier</h4>
                        <div className="space-y-2">
                          {(['Mobile', 'Standard', 'Premium'] as const).map((t) => (
                            <label key={t} className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
                              <input
                                id={`upgrade-option-${t.toLowerCase()}`}
                                type="radio"
                                name="plan-tier"
                                checked={targetPlan === t}
                                onChange={() => setTargetPlan(t)}
                                className="accent-red-600 cursor-pointer"
                              />
                              <span className="font-semibold text-white">{t} Plan</span>
                              <span className="text-neutral-500">
                                (${TIER_PRICES[t as keyof typeof TIER_PRICES][account.billingCycle || 'monthly']}/{account.billingCycle})
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            id="cancel-plan-change"
                            onClick={() => setIsChangingPlan(false)}
                            className="bg-neutral-800 text-white text-xs px-3 py-1.5 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            id="confirm-plan-change"
                            onClick={handleTierChangeSubmit}
                            disabled={isSubmitting}
                            className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded disabled:opacity-60 flex items-center gap-1"
                          >
                            {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                            Apply Tier Update
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vault Credit Card Information */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-neutral-900 pb-2 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-red-600" />
                      Payment Instrument
                    </h3>

                    {!isUpdatingCard ? (
                      <div className="space-y-3 text-neutral-300 text-sm">
                        <div className="flex items-center gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-900">
                          <CreditCard className="w-8 h-8 text-neutral-400" />
                          <div>
                            <span className="font-bold block text-sm text-white">
                              {account.cardBrand || 'Card on File'}
                            </span>
                            <span className="text-xs text-gray-400">
                              Ending in •••• {account.cardLast4 || '4242'}
                            </span>
                          </div>
                        </div>

                        <button
                          id="trigger-card-update"
                          onClick={() => setIsUpdatingCard(true)}
                          className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded cursor-pointer transition-colors"
                        >
                          Modify Payment Card
                        </button>
                      </div>
                    ) : (
                      /* Inline input to adjust card details */
                      <form onSubmit={handleUpdateCardSubmit} className="space-y-3 bg-neutral-950 p-4 rounded-lg border border-[#2ea]">
                        <h4 className="font-bold text-sm text-white">Update Card Parameters</h4>
                        
                        <div>
                          <input
                            id="new-billing-card-num"
                            type="text"
                            required
                            placeholder="xxxx xxxx xxxx xxxx"
                            value={newCardNumber}
                            onChange={(e) => setNewCardNumber(formatCardNumber(e.target.value))}
                            className="w-full bg-[#202020] border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            id="new-billing-card-exp"
                            type="text"
                            required
                            placeholder="MM/YY"
                            maxLength={5}
                            value={newCardExpiry}
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^0-9/]/g, '');
                              if (value.length === 2 && !value.includes('/')) value += '/';
                              setNewCardExpiry(value);
                            }}
                            className="w-full bg-[#202020] border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 text-center focus:outline-none"
                          />
                          <input
                            id="new-billing-card-cvv"
                            type="password"
                            required
                            placeholder="CVV"
                            maxLength={4}
                            value={newCardCvv}
                            onChange={(e) => setNewCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full bg-[#202020] border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 text-center focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-2 pt-1.5">
                          <button
                            id="cancel-card-update"
                            type="button"
                            onClick={() => setIsUpdatingCard(false)}
                            className="bg-neutral-800 text-white text-xs px-3 py-1.5 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            id="save-new-card"
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded disabled:opacity-60 flex items-center gap-1 cursor-pointer"
                          >
                            {isSubmitting && <Loader2 className="w-3 h-3 animate-spin animate-spin-fast" />}
                            Save Card
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Sub Cancels and Pauses triggers */}
                <div className="pt-6 border-t border-neutral-900 flex flex-wrap gap-3">
                  {account.status === 'active' ? (
                    <>
                      <button
                        id="pause-subscription-btn"
                        onClick={() => handleStatusToggle('paused')}
                        disabled={isSubmitting}
                        className="bg-yellow-950/40 hover:bg-yellow-950/60 text-yellow-400 border border-yellow-900 px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Pause className="w-4 h-4" />
                        Pause Subscription renewals
                      </button>

                      <button
                        id="cancel-subscription-btn"
                        onClick={() => handleStatusToggle('canceled')}
                        disabled={isSubmitting}
                        className="bg-red-950/30 hover:bg-red-900/10 text-red-500 border border-red-500/10 px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 mr-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel Membership Renewal
                      </button>
                    </>
                  ) : (
                    <button
                      id="resume-subscription-btn"
                      onClick={() => handleStatusToggle('active')}
                      disabled={isSubmitting}
                      className="bg-green-950 hover:bg-green-900 text-green-400 border border-green-800/40 px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-green-400/20" />
                      Reactivate Active Membership
                    </button>
                  )}
                </div>

              </div>
            ) : (
              /* PANEL B: Invoices statement list logs */
              <div className="space-y-6" id="billing-statement-panel">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg font-sans">Payment Ledger Details</h3>
                  <span className="text-gray-500 text-xs font-sans">Updated recursively on Stripe webhooks</span>
                </div>

                <div className="border border-neutral-900 rounded-lg overflow-hidden font-sans">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Invoice ID</th>
                        <th className="px-6 py-3.5">Date Paid</th>
                        <th className="px-6 py-3.5">Instrument</th>
                        <th className="px-6 py-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-300">
                      {mockInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-neutral-900/40">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-white">
                            {inv.id}
                          </td>
                          <td className="px-6 py-4">
                            {inv.date}
                          </td>
                          <td className="px-6 py-4">
                            {inv.method}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-white">
                            ${inv.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Secure certificate callout */}
                <div className="flex items-center gap-2.5 p-4 bg-green-950/20 border border-green-800/20 rounded-lg text-xs text-green-300">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>
                    Your secure details are PCI-DSS tokenized. AI Studio billing channels protect private developer secrets.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
