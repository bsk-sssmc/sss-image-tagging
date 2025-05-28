'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardTagsTable from '../components/DashboardTagsTable';
import ConsolidatedTagsTable from '../components/ConsolidatedTagsTable';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  // Protect the dashboard route - only allow admin access
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (!isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, router]);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-header">Dashboard</h1>
      <DashboardTagsTable />
      <div style={{ marginTop: '2rem' }}>
        <ConsolidatedTagsTable />
      </div>
    </div>
  );
} 