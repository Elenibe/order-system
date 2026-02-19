// app/vendor/register/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerVendor } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Store, Mail, Lock, User, Phone, MapPin, Building, Hash, AlertCircle, CheckCircle, Plus, Trash2, CreditCard, Smartphone } from 'lucide-react';

export default function VendorRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    company_name: '',
    tin_number: '',
    contact_person: '',
    phone_number: '',
    address: '',
    business_category: 'general',
    welcome_message: ''
  });
  
  // Multiple bank accounts
  const [bankAccounts, setBankAccounts] = useState([
    { account_name: '', account_number: '', bank_name: '' }
  ]);
  
  // Multiple Telebirr accounts
  const [telebirrAccounts, setTelebirrAccounts] = useState([
    { account_name: '', phone_number: '' }
  ]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add new bank account
  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { account_name: '', account_number: '', bank_name: '' }]);
  };

  // Remove bank account
  const removeBankAccount = (index) => {
    if (bankAccounts.length > 1) {
      setBankAccounts(bankAccounts.filter((_, i) => i !== index));
    }
  };

  // Update bank account
  const updateBankAccount = (index, field, value) => {
    const updated = [...bankAccounts];
    updated[index][field] = value;
    setBankAccounts(updated);
  };

  // Add new Telebirr account
  const addTelebirrAccount = () => {
    setTelebirrAccounts([...telebirrAccounts, { account_name: '', phone_number: '' }]);
  };

  // Remove Telebirr account
  const removeTelebirrAccount = (index) => {
    if (telebirrAccounts.length > 1) {
      setTelebirrAccounts(telebirrAccounts.filter((_, i) => i !== index));
    }
  };

  // Update Telebirr account
  const updateTelebirrAccount = (index, field, value) => {
    const updated = [...telebirrAccounts];
    updated[index][field] = value;
    setTelebirrAccounts(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate at least one payment method
    const hasBank = bankAccounts.some(b => b.account_number && b.bank_name);
    const hasTelebirr = telebirrAccounts.some(t => t.phone_number);
    
    if (!hasBank && !hasTelebirr) {
      setError('Please add at least one payment method (Bank or Telebirr)');
      setLoading(false);
      return;
    }

    try {
      const deepLink = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      // Register vendor (use first bank account for backward compatibility)
      const firstBank = bankAccounts[0];
      const result = await registerVendor({
        email: formData.email,
        password: formData.password,
        company_name: formData.company_name,
        tin_number: formData.tin_number,
        contact_person: formData.contact_person,
        phone_number: formData.phone_number,
        address: formData.address,
        business_category: formData.business_category || 'general',
        welcome_message: formData.welcome_message || null,
        bot_deep_link: deepLink
      });

      if (result.error) {
        throw new Error(result.error);
      }

const vendorId = result.data?.id;

// After vendor is successfully created, save all payment accounts
if (vendorId && (bankAccounts.length > 0 || telebirrAccounts.length > 0)) {
  const paymentRecords = [];

  // Add all bank accounts
  bankAccounts.forEach((bank, index) => {
  if (bank.account_number && bank.bank_name) {
    const accountName = bank.account_name?.trim() ? bank.account_name.trim() : formData.company_name;
    paymentRecords.push({
      vendor_id: vendorId,
      account_type: 'bank',
      account_name: accountName,
      account_holder_name: accountName,
      account_number: bank.account_number,
      bank_name: bank.bank_name,
      is_active: true
    });
  }
});

// Add all telebirr accounts
  telebirrAccounts.forEach((telebirr, index) => {
  if (telebirr.phone_number) {
    const accountName = telebirr.account_name?.trim() ? telebirr.account_name.trim() : formData.company_name;
    paymentRecords.push({
      vendor_id: vendorId,
      account_type: 'telebirr',
      account_name: accountName,
      account_holder_name: accountName,
      account_number: telebirr.phone_number,
      bank_name: 'Telebirr',
      is_active: true
    });
  }
});
  console.log('[v0] Saving payment accounts:', paymentRecords);

  if (paymentRecords.length > 0) {
    const { error: paymentError } = await supabase
      .from('payment_accounts')
      .insert(paymentRecords);

    if (paymentError) {
      console.error('[v0] Error saving payment accounts:', paymentError);
      throw new Error('Failed to save payment accounts');
    }
    console.log('[v0] All payment accounts saved successfully');
  }
}
      setSuccess(true);
      setTimeout(() => {
        router.push('/vendor/login');
      }, 3000);

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-500 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your vendor account has been created successfully. Please wait for admin approval.
          </p>
          <p className="text-sm text-gray-500">
            You will be notified once your account is approved.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Store className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Vendor</h1>
          <p className="text-gray-600">Join our platform and start selling to thousands of customers</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Account Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="vendor@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="********"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="********"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Company Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    required
                    value={formData.company_name}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ABC Trading Company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TIN Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="tin_number"
                      value={formData.tin_number}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="contact_person"
                      required
                      value={formData.contact_person}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phone_number"
                      required
                      value={formData.phone_number}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0911234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Category *
                  </label>
                  <select
                    name="business_category"
                    value={formData.business_category}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="general">General/Wholesale</option>
                    <option value="retail">Retail Shop (Shoes, Clothes, Electronics)</option>
                    <option value="manufacturing">Manufacturing (Custom Orders)</option>
                    <option value="food">Food & Restaurant</option>
                    <option value="construction">Construction Materials</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Addis Ababa, Ethiopia"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message (Optional)
                  </label>
                  <textarea
                    name="welcome_message"
                    value={formData.welcome_message}
                    onChange={handleChange}
                    rows="2"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Welcome to our shop! Browse and order directly."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Shown to customers when they start chatting with your bot
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Accounts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Bank Accounts
                </h2>
                <button
                  type="button"
                  onClick={addBankAccount}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Bank
                </button>
              </div>
              
              <div className="space-y-4">
                {bankAccounts.map((bank, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Bank Account {index + 1}</span>
                      {bankAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBankAccount(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Account Holder Name"
                        value={bank.account_name}
                        onChange={(e) => updateBankAccount(index, 'account_name', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={bank.account_number}
                        onChange={(e) => updateBankAccount(index, 'account_number', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Bank Name (e.g., CBE, Awash)"
                        value={bank.bank_name}
                        onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Telebirr Accounts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  Telebirr Accounts
                </h2>
                <button
                  type="button"
                  onClick={addTelebirrAccount}
                  className="flex items-center text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Telebirr
                </button>
              </div>
              
              <div className="space-y-4">
                {telebirrAccounts.map((telebirr, index) => (
                  <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Telebirr Account {index + 1}</span>
                      {telebirrAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTelebirrAccount(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={telebirr.account_name}
                        onChange={(e) => updateTelebirrAccount(index, 'account_name', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number (e.g., 0911234567)"
                        value={telebirr.phone_number}
                        onChange={(e) => updateTelebirrAccount(index, 'phone_number', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Add at least one payment method (Bank or Telebirr) for customers to pay you
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Creating Account...' : 'Create Vendor Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/vendor/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}