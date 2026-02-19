// app/admin/settings/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Save, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function AdminSettings() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Payment Accounts
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    account_type: 'bank',
    is_active: true
  });

  // Categories
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name_en: '',
    name_am: '',
    is_active: true
  });

  // Platform Settings
  const [platformSettings, setPlatformSettings] = useState({
    commission_rate: 10,
    tax_rate: 15,
    auto_approval_enabled: false,
    maintenance_mode: false
  });

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setUserData(session);
    loadSettings();
  }, [router]);

  const loadSettings = async () => {
    // Load payment accounts
    const { data: accounts } = await supabase
      .from('payment_accounts')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (accounts) setPaymentAccounts(accounts);

    // Load categories
    const { data: cats } = await supabase
      .from('business_categories')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (cats) setCategories(cats);

    setLoading(false);
  };

  // Payment Account Functions
  const handleAddAccount = async () => {
    if (!newAccount.account_name || !newAccount.account_number || !newAccount.bank_name) {
      alert('Please fill all required fields');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('payment_accounts')
      .insert([{ ...newAccount, display_order: paymentAccounts.length }]);

    if (!error) {
      await loadSettings();
      setNewAccount({
        account_name: '',
        account_number: '',
        bank_name: '',
        account_type: 'bank',
        is_active: true
      });
      alert('Payment account added successfully!');
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleUpdateAccount = async (id, updates) => {
    setSaving(true);
    const { error } = await supabase
      .from('payment_accounts')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await loadSettings();
      setEditingAccount(null);
      alert('Account updated!');
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDeleteAccount = async (id) => {
    if (!confirm('Delete this payment account?')) return;

    const { error } = await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadSettings();
      alert('Account deleted!');
    }
  };

  // Category Functions
  const handleAddCategory = async () => {
    if (!newCategory.name_en || !newCategory.name_am) {
      alert('Please fill all required fields');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('business_categories')
      .insert([{ ...newCategory, display_order: categories.length }]);

    if (!error) {
      await loadSettings();
      setNewCategory({ name_en: '', name_am: '', is_active: true });
      alert('Category added successfully!');
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleUpdateCategory = async (id, updates) => {
    setSaving(true);
    const { error } = await supabase
      .from('business_categories')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await loadSettings();
      setEditingCategory(null);
      alert('Category updated!');
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;

    const { error } = await supabase
      .from('business_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadSettings();
      alert('Category deleted!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="admin" userData={userData}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-600 mt-1">Manage payment accounts, categories, and configurations</p>
        </div>

        {/* Payment Accounts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Payment Accounts</h2>
            <p className="text-sm text-gray-600 mt-1">Bank accounts where customers send payments</p>
          </div>
          
          <div className="p-6">
            {/* Add New Account Form */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Add New Payment Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Account Name"
                  value={newAccount.account_name}
                  onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={newAccount.account_number}
                  onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={newAccount.bank_name}
                  onChange={(e) => setNewAccount({...newAccount, bank_name: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <select
                  value={newAccount.account_type}
                  onChange={(e) => setNewAccount({...newAccount, account_type: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="bank">Bank Account</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                onClick={handleAddAccount}
                disabled={saving}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Account
              </button>
            </div>

            {/* Existing Accounts */}
            <div className="space-y-3">
              {paymentAccounts.map(account => (
                <div key={account.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  {editingAccount === account.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        defaultValue={account.account_name}
                        className="border rounded px-3 py-1 w-full"
                        id={`name-${account.id}`}
                      />
                      <input
                        type="text"
                        defaultValue={account.account_number}
                        className="border rounded px-3 py-1 w-full"
                        id={`number-${account.id}`}
                      />
                      <input
                        type="text"
                        defaultValue={account.bank_name}
                        className="border rounded px-3 py-1 w-full"
                        id={`bank-${account.id}`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleUpdateAccount(account.id, {
                              account_name: document.getElementById(`name-${account.id}`).value,
                              account_number: document.getElementById(`number-${account.id}`).value,
                              bank_name: document.getElementById(`bank-${account.id}`).value
                            });
                          }}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingAccount(null)}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{account.account_name}</p>
                        <p className="text-sm text-gray-600">
                          {account.bank_name} - {account.account_number}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateAccount(account.id, { is_active: !account.is_active })}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          {account.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setEditingAccount(account.id)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Product Categories</h2>
            <p className="text-sm text-gray-600 mt-1">Manage product categories for the platform</p>
          </div>
          
          <div className="p-6">
            {/* Add New Category Form */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Add New Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Name (English)"
                  value={newCategory.name_en}
                  onChange={(e) => setNewCategory({...newCategory, name_en: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Name (Amharic)"
                  value={newCategory.name_am}
                  onChange={(e) => setNewCategory({...newCategory, name_am: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <button
                onClick={handleAddCategory}
                disabled={saving}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>

            {/* Existing Categories */}
            <div className="space-y-3">
              {categories.map(category => (
                <div key={category.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{category.name_en}</p>
                      <p className="text-sm text-gray-600">{category.name_am}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateCategory(category.id, { is_active: !category.is_active })}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {category.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Commission Rate (%)
              </label>
              <input
                type="number"
                value={platformSettings.commission_rate}
                onChange={(e) => setPlatformSettings({...platformSettings, commission_rate: parseFloat(e.target.value)})}
                className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-64"
              />
              <p className="text-xs text-gray-500 mt-1">Platform commission on each transaction</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={platformSettings.tax_rate}
                onChange={(e) => setPlatformSettings({...platformSettings, tax_rate: parseFloat(e.target.value)})}
                className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-64"
              />
              <p className="text-xs text-gray-500 mt-1">VAT or applicable tax rate</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={platformSettings.auto_approval_enabled}
                onChange={(e) => setPlatformSettings({...platformSettings, auto_approval_enabled: e.target.checked})}
                className="h-5 w-5 text-blue-600"
              />
              <label className="text-sm font-medium text-gray-700">
                Enable Auto-Approval for Vendors
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={platformSettings.maintenance_mode}
                onChange={(e) => setPlatformSettings({...platformSettings, maintenance_mode: e.target.checked})}
                className="h-5 w-5 text-red-600"
              />
              <label className="text-sm font-medium text-gray-700">
                Maintenance Mode (Disable new orders)
              </label>
            </div>

            <button
              onClick={() => alert('Platform settings saved! (Connect to DB to persist)')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}