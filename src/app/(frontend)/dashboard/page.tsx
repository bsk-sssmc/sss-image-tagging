'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardTagsTable from '../components/DashboardTagsTable';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Protect the dashboard route - only allow admin access
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-header">Dashboard</h1>
      <DashboardTagsTable />
    </div>
  );
} 