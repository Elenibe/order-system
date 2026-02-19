'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Save } from 'lucide-react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function VendorSettings() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    use_product_catalog: false,
    welcome_message: ''
  });
  const [changeRequests, setChangeRequests] = useState([]);
const [showChangeForm, setShowChangeForm] = useState(false);
const [changeField, setChangeField] = useState('');
const [changeValue, setChangeValue] = useState('');
const [submittingChange, setSubmittingChange] = useState(false);
const [vendorPaymentAccounts, setVendorPaymentAccounts] = useState([]);

  useEffect(() => {
    const session = getSession('vendor');
    if (!session) {
      router.push('/vendor/login');
      return;
    }
    setUserData(session);
    loadSettings(session.id);
  }, [router]);

useEffect(() => {
  if (userData?.id) {
    loadChangeRequests();
  }
}, [userData?.id]);

useEffect(() => {
  if (userData?.id) {
    loadPaymentAccounts();
  }
}, [userData?.id]);

const loadChangeRequests = async () => {
  try {
    const { data, error } = await supabase
      .from('vendor_change_requests')
      .select('*')
      .eq('vendor_id', userData.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setChangeRequests(data || []);
  } catch (error) {
    console.error('Error loading change requests:', error);
  }
};


const loadPaymentAccounts = async () => {
  try {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('vendor_id', userData.id)
      .eq('is_active', true);

    if (error) throw error;
    setVendorPaymentAccounts(data || []);
  } catch (error) {
    console.error('Error loading payment accounts:', error);
  }
};


const submitChangeRequest = async () => {
  if (!changeField || !changeValue.trim()) {
    alert('Please select a field and enter a value');
    return;
  }

  setSubmittingChange(true);
  try {
    // Get current value from userData
    let currentValue = '';
    if (changeField === 'phone_number') {
      currentValue = userData.phone_number || '';
    } else if (changeField === 'email') {
      currentValue = userData.email || '';
    } else if (changeField === 'company_name') {
      currentValue = userData.company_name || '';
    } else if (changeField === 'payment_accounts') {
      currentValue = 'Existing payment methods';
    }

    const { error } = await supabase
      .from('vendor_change_requests')
      .insert({
        vendor_id: userData.id,
        field_name: changeField,
        current_value: currentValue,
        proposed_value: changeValue,
        status: 'pending'
      });

    if (error) throw error;
    alert('Change request submitted! Admin will review and approve.');
    setChangeField('');
    setChangeValue('');
    setShowChangeForm(false);
    await loadChangeRequests();
  } catch (error) {
    console.error('Error submitting change request:', error);
    alert('Error submitting request: ' + error.message);
  } finally {
    setSubmittingChange(false);
  }
};

const getFieldLabel = (field) => {
  const labels = {
    company_name: 'Company Name',
    email: 'Email Address',
    phone_number: 'Phone Number'
  };
  return labels[field] || field;
};

const getStatusColor = (status) => {
  if (status === 'approved') return 'bg-green-50 border-green-200';
  if (status === 'rejected') return 'bg-red-50 border-red-200';
  return 'bg-yellow-50 border-yellow-200';
};

const getStatusIcon = (status) => {
  if (status === 'approved') return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (status === 'rejected') return <XCircle className="h-5 w-5 text-red-600" />;
  return <AlertCircle className="h-5 w-5 text-yellow-600" />;
};
  const loadSettings = async (vendorId) => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('use_product_catalog, welcome_message')
        .eq('id', vendorId)
        .single();

      if (error) throw error;
      setSettings({
        use_product_catalog: data.use_product_catalog || false,
        welcome_message: data.welcome_message || ''
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          use_product_catalog: settings.use_product_catalog,
          welcome_message: settings.welcome_message
        })
        .eq('id', userData.id);

      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="vendor" userData={userData}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your bot and ordering preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Catalog</h2>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="use_catalog"
                  type="checkbox"
                  checked={settings.use_product_catalog}
                  onChange={(e) => setSettings({...settings, use_product_catalog: e.target.checked})}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="use_catalog" className="font-medium text-gray-700">
                  Enable Product Code Ordering
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  When enabled, customers can order by sending product codes (e.g., SH8).
                  <br />
                  Make sure to add products in the <strong>Products</strong> page first.
                </p>
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome Message</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom welcome message for new customers
            </label>
            <textarea
              value={settings.welcome_message}
              onChange={(e) => setSettings({...settings, welcome_message: e.target.value})}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Welcome to our shop! Browse our products and order directly via Telegram."
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be shown when customers first access your bot link.
            </p>
          </div>

          <div className="border-b pb-4">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
  <p className="text-sm text-gray-600 mb-4">
    To change your company name, email, phone, or payment information, submit a request below. 
    An admin will review and approve your changes.
  </p>

  {/* Change Request Form */}
  {!showChangeForm ? (
    <button
      onClick={() => setShowChangeForm(true)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
    >
      Request to Change Information
    </button>
  ) : (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What would you like to change?
        </label>
       <select
  value={changeField}
  onChange={(e) => setChangeField(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
>
  <option value="">Select a field...</option>
  <option value="company_name">Company Name</option>
  <option value="email">Email Address</option>
  <option value="phone_number">Phone Number</option>
</select>
      </div>

      {changeField && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Value
          </label>
          <div className="px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-600 text-sm">
            {userData[changeField] || 'Not set'}
          </div>
        </div>
      )}

      {changeField && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Value
          </label>
          <input
            type={changeField === 'email' ? 'email' : 'text'}
            value={changeValue}
            onChange={(e) => setChangeValue(e.target.value)}
            placeholder="Enter new value..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={submitChangeRequest}
          disabled={submittingChange}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {submittingChange ? 'Submitting...' : 'Submit Request'}
        </button>
        <button
          onClick={() => {
            setShowChangeForm(false);
            setChangeField('');
            setChangeValue('');
          }}
          className="flex-1 bg-gray-300 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-400 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )}

  <div className="mb-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Accounts</h3>
  <p className="text-sm text-gray-600 mb-3">
    Your customers will pay directly to these accounts. To add or change payment methods, contact admin support.
  </p>
  
  {vendorPaymentAccounts.length === 0 ? (
    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">No payment accounts registered</p>
  ) : (
    <div className="space-y-3">
      {vendorPaymentAccounts.map((account) => (
        <div key={account.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {account.account_type === 'telebirr' ? '📱 Telebirr' : '🏦 Bank Account'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Account Holder:</span> {account.account_holder_name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{account.account_type === 'telebirr' ? 'Phone:' : 'Number:'}</span> {account.account_number}
              </p>
              {account.account_type === 'bank' && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Bank:</span> {account.bank_name}
                </p>
              )}
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
  
  <p className="text-xs text-gray-500 mt-3">
    To update payment methods, please contact the admin through the <a href="/vendor/contact-admin" className="text-blue-600 hover:underline">Contact Admin</a> page.
  </p>
</div>

  {/* Change Requests History */}
  {changeRequests.length > 0 && (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending & Past Requests</h3>
      <div className="space-y-3">
        {changeRequests.map((req) => (
          <div key={req.id} className={`border-2 rounded-lg p-4 ${getStatusColor(req.status)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getStatusIcon(req.status)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {getFieldLabel(req.field_name)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Current:</span> {req.current_value || 'Not set'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Requested:</span> {req.proposed_value}
                  </p>
                  {req.admin_notes && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Admin Notes:</span> {req.admin_notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(req.created_at).toLocaleDateString()} - Status: <span className="capitalize font-semibold">{req.status}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}