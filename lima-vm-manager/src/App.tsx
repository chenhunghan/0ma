import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { VMList, VMDetails, VMForm } from './components/vm-management';
import { ConfigurationPage } from './components/configuration';
import { DashboardPage } from './components/dashboard';
import { ToastContainer } from './components/ui';
import { GlobalErrorBoundary, NetworkErrorBoundary, RetryBoundary } from './components/error';
import { useVMs } from './hooks/useVMs';
import { useConfig } from './hooks/useConfig';
import { useNotifications } from './hooks/useNotifications';
import type { VM } from './types';

// Placeholder pages
const Monitoring = () => <div>Monitoring Page - Coming Soon</div>;

function App() {
  const { vms, loading: vmsLoading, error: vmsError } = useVMs();
  const { config, loading: configLoading } = useConfig();
  const { showSuccess, showError, notifications, removeNotification } = useNotifications();

  // VM management state
  const [selectedVM, setSelectedVM] = useState<VM | null>(null);
  const [showVMForm, setShowVMForm] = useState(false);
  const [editingVM, setEditingVM] = useState<VM | null>(null);

  // Test our hooks and API connections
  React.useEffect(() => {
    if (vmsError) {
      showError('Connection Error', vmsError);
    }
  }, [vmsError, showError]);

  React.useEffect(() => {
    if (!vmsLoading && !configLoading) {
      showSuccess(
        'Application Ready',
        `Loaded ${vms.length} VMs successfully`
      );
    }
  }, [vmsLoading, configLoading, vms.length, showSuccess]);

  // VM management handlers
  const handleCreateVM = () => {
    setEditingVM(null);
    setShowVMForm(true);
  };

  const handleEditVM = (vm: VM) => {
    setEditingVM(vm);
    setShowVMForm(true);
  };

  const handleViewDetails = (vm: VM) => {
    setSelectedVM(vm);
  };

  const handleVMFormSuccess = (vm: VM) => {
    setShowVMForm(false);
    setEditingVM(null);
    showSuccess('Success', `VM "${vm.name}" has been created successfully`);
  };

  return (
    <GlobalErrorBoundary>
      <NetworkErrorBoundary>
        <Router>
          <MainLayout>
            <RetryBoundary maxRetries={2}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/vms" element={
                  <VMList
                    onCreateVM={handleCreateVM}
                    onEditVM={handleEditVM}
                    onViewDetails={handleViewDetails}
                  />
                } />
                <Route path="/configuration" element={<ConfigurationPage />} />
                <Route path="/monitoring" element={<Monitoring />} />
              </Routes>

              {/* VM Details Modal */}
              {selectedVM && (
                <VMDetails
                  vmId={selectedVM.id}
                  onEdit={handleEditVM}
                  onClose={() => setSelectedVM(null)}
                />
              )}

              {/* VM Form Modal */}
              {showVMForm && (
                <VMForm
                  vmId={editingVM?.id}
                  open={showVMForm}
                  onClose={() => setShowVMForm(false)}
                  onSuccess={handleVMFormSuccess}
                />
              )}

              {/* Toast Notifications */}
              <ToastContainer position="top-right">
                {notifications.map((notification) => (
                  <Toast
                    key={notification.id}
                    notification={notification}
                    onClose={removeNotification}
                    onAction={(action) => action()}
                  />
                ))}
              </ToastContainer>
            </RetryBoundary>
          </MainLayout>
        </Router>
      </NetworkErrorBoundary>
    </GlobalErrorBoundary>
  );
}

export default App;
