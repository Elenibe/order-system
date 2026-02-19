// app/vendor/pending-approval/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/lib/auth';
import { Clock, AlertCircle, LogOut } from 'lucide-react';

export default function PendingApproval() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const session = getSession('vendor');
    if (!session) {
      router.push('/vendor/login');
      return;
    }
    setUserData(session);
  }, [router]);

  const handleLogout = () => {
    clearSession('vendor');
    router.push('/vendor/login');
  };

  const statusMessages = {
    pending: {
      title: 'Account Pending Approval',
      message: 'Your vendor account is currently being reviewed by our admin team. This usually takes 1-2 business days.',
      icon: Clock,
      color: 'yellow'
    },
    rejected: {
      title: 'Account Not Approved',
      message: 'Unfortunately, your vendor application was not approved. Please contact support for more information.',
      icon: AlertCircle,
      color: 'red'
    },
    suspended: {
      title: 'Account Suspended',
      message: 'Your vendor account has been suspended. Please contact support to resolve this issue.',
      icon: AlertCircle,
      color: 'red'
    }
  };

  const status = userData?.status || 'pending';
  const statusInfo = statusMessages[status] || statusMessages.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className={`mx-auto w-16 h-16 bg-${statusInfo.color}-100 rounded-full flex items-center justify-center mb-4`}>
          <StatusIcon className={`h-8 w-8 text-${statusInfo.color}-600`} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {statusInfo.title}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {statusInfo.message}
        </p>

        {userData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Your Information:</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Company:</span> {userData.company_name}</p>
              <p><span className="font-medium">Email:</span> {userData.email}</p>
              <p><span className="font-medium">Contact:</span> {userData.contact_person}</p>
              <p><span className="font-medium">Status:</span> <span className="capitalize">{userData.status}</span></p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check Status Again
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Need help? Contact us at support@platform.com
        </p>
      </div>
    </div>
  );
}