'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { DollarSign } from 'lucide-react';

export default function VendorEarnings() {
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

  return (
    <DashboardLayout userType="vendor" userData={userData}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600 mt-1">Track your revenue and payments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Earnings</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0 Birr</p>
            <p className="text-sm text-gray-500 mt-1">After commission</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Pending Payment</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">0 Birr</p>
            <p className="text-sm text-gray-500 mt-1">Awaiting release</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Paid Out</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">0 Birr</p>
            <p className="text-sm text-gray-500 mt-1">Total received</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Transactions Yet</h2>
          <p className="text-gray-600">
            Your earnings will appear here once you complete orders.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}