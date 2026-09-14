import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  Activity,
  Layers,
  Eye,
  Download,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../data/apiClient';
import { Modal } from '../components/common/Modal';
import { showToast } from '../utils/alerts';

interface SystemLogItem {
  id: number | string;
  userId: number | string | null;
  userName: string;
  userEmail: string;
  role: string;
  module: string;
  action: string;
  description: string;
  targetId: string | null;
  targetType: string | null;
  status: 'Success' | 'Failed';
  ipAddress: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const MODULE_OPTIONS = [
  'ALL',
  'Authentication',
  'User Management',
  'Academic Management',
  'Faculty Management',
  'Room Management',
  'Class Scheduling',
  'Exam Scheduling',
];

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'super_admin', label: 'Super Admin (ICT)' },
  { value: 'admin', label: 'Dean / Admin' },
  { value: 'program_head', label: 'Program Head' },
  { value: 'teacher', label: 'Faculty / Teacher' },
  { value: 'system', label: 'System' },
];

export function SystemLogsPage() {
  const navigate = useNavigate();
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase();

  // Redirect non-super-admins immediately
  useEffect(() => {
    if (userRole && userRole !== 'super_admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [userRole, navigate]);

  // States
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Details Modal
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    activeModules: 0,
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;

      const now = new Date();
      if (dateFilter === 'today') {
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
      } else if (dateFilter === '7days') {
        const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = past.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else if (dateFilter === '30days') {
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = past.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      }

      const params: Record<string, any> = {
        page,
        limit: 20,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedModule !== 'ALL') params.module = selectedModule;
      if (selectedRole !== 'ALL') params.role = selectedRole;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/system-logs', { params });
      const payload = res?.data || {};
      const data: SystemLogItem[] = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data?.data)
        ? payload.data.data
        : [];
      const pag = payload.pagination || payload.data?.pagination || {
        page: 1,
        limit: 20,
        total: data.length,
        totalPages: 1,
      };

      setLogs(data);
      setPagination(pag);

      // Compute stats
      const total = pag.total || data.length;
      const successCount = data.filter((d: SystemLogItem) => d.status === 'Success').length;
      const failedCount = data.filter((d: SystemLogItem) => d.status === 'Failed').length;
      const uniqueModules = new Set(data.map((d: SystemLogItem) => d.module)).size;

      setStats({
        total,
        success: successCount,
        failed: failedCount,
        activeModules: uniqueModules || 7,
      });
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('Access Forbidden. Only the ICT Super Administrator can access System Logs.');
      } else {
        const errorMsg =
          typeof err?.response?.data?.error === 'string'
            ? err.response.data.error
            : typeof err?.response?.data?.error?.message === 'string'
            ? err.response.data.error.message
            : typeof err?.response?.data?.message === 'string'
            ? err.response.data.message
            : typeof err?.message === 'string'
            ? err.message
            : 'Failed to load system logs.';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedModule, selectedRole, selectedStatus, dateFilter]);

  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchLogs();
    }
  }, [fetchLogs, userRole]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedModule('ALL');
    setSelectedRole('ALL');
    setSelectedStatus('ALL');
    setDateFilter('all');
    setPage(1);
  };

  const handleExportCSV = () => {
    if (!logs.length) {
      showToast('No logs available to export.', 'info');
      return;
    }

    const headers = ['ID', 'Timestamp', 'User', 'Email', 'Role', 'Module', 'Action', 'Description', 'Target ID', 'Target Type', 'Status', 'IP Address'];
    const rows = logs.map((l) => [
      l.id,
      `"${new Date(l.createdAt).toLocaleString()}"`,
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.userEmail || ''}"`,
      l.role,
      `"${l.module}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.targetId || ''}"`,
      `"${l.targetType || ''}"`,
      l.status,
      `"${l.ipAddress || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `system_logs_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('System audit log exported to CSV', 'success');
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin / DSA';
      case 'program_head':
        return 'Program Head';
      case 'teacher':
        return 'Teacher';
      default:
        return role || 'System';
    }
  };

  if (userRole !== 'super_admin') {
    return (
      <div className="system-logs-container">
        <div className="system-logs-stat-card" style={{ borderColor: '#f43f5e', background: 'rgba(244, 63, 94, 0.05)' }}>
          <AlertTriangle size={32} color="#f43f5e" />
          <div>
            <h3 style={{ color: '#f43f5e', margin: 0, fontWeight: 700 }}>403 — Unauthorized Access</h3>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
              System Logs and Audit Trail are restricted exclusively to the ICT Super Administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="system-logs-container">
      {/* Header */}
      <div className="system-logs-header">
        <div className="system-logs-title-area">
          <h1>
            <ScrollText size={28} color="#7c3aed" />
            <span>System Audit Logs</span>
            <span className="system-logs-badge">
              <Shield size={13} />
              <span>ICT Governance & Audit</span>
            </span>
          </h1>
          <p>
            Permanent immutable audit trail of institutional system events, user authentications, and record modifications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="system-logs-reset-btn"
            onClick={fetchLogs}
            disabled={loading}
            title="Refresh logs"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="system-logs-reset-btn"
            style={{ background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
            onClick={handleExportCSV}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="system-logs-stats-grid">
        <div className="system-logs-stat-card">
          <div className="system-logs-stat-icon purple">
            <Activity size={22} />
          </div>
          <div className="system-logs-stat-info">
            <div className="stat-value">{pagination.total}</div>
            <div className="stat-label">Total Logged Actions</div>
          </div>
        </div>

        <div className="system-logs-stat-card">
          <div className="system-logs-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="system-logs-stat-info">
            <div className="stat-value" style={{ color: '#10b981' }}>{stats.success}</div>
            <div className="stat-label">Successful Operations (Page)</div>
          </div>
        </div>

        <div className="system-logs-stat-card">
          <div className="system-logs-stat-icon rose">
            <XCircle size={22} />
          </div>
          <div className="system-logs-stat-info">
            <div className="stat-value" style={{ color: stats.failed > 0 ? '#f43f5e' : '#64748b' }}>
              {stats.failed}
            </div>
            <div className="stat-label">Failed / Flagged Attempts</div>
          </div>
        </div>

        <div className="system-logs-stat-card">
          <div className="system-logs-stat-icon blue">
            <Layers size={22} />
          </div>
          <div className="system-logs-stat-info">
            <div className="stat-value">{MODULE_OPTIONS.length - 1}</div>
            <div className="stat-label">Monitored System Modules</div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="system-logs-filter-card">
        <div className="system-logs-filter-grid">
          {/* Search Box */}
          <div className="system-logs-search-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="system-logs-search-input"
              placeholder="Search description, user, action, target..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              className="system-logs-select"
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Modules</option>
              {MODULE_OPTIONS.filter((m) => m !== 'ALL').map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              className="system-logs-select"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="system-logs-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Success">Success Only</option>
              <option value="Failed">Failed Only</option>
            </select>
          </div>

          {/* Date Presets */}
          <div>
            <select
              className="system-logs-select"
              value={dateFilter}
              onChange={(e: any) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            className="system-logs-reset-btn"
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="system-logs-table-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="spin" style={{ margin: '0 auto 0.75rem auto' }} />
            <p>Loading audit trail records...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#f43f5e' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 0.75rem auto' }} />
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <ScrollText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>No audit logs found</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              No system action records match the current filter criteria.
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="system-logs-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td>
                        <div className="system-logs-user-cell">
                          <span className="system-logs-user-name">{log.userName}</span>
                          {log.userEmail && <span className="system-logs-user-email">{log.userEmail}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`system-logs-role-tag ${log.role?.toLowerCase()}`}>
                          {getRoleLabel(log.role)}
                        </span>
                      </td>
                      <td>
                        <span className="system-logs-module-pill">{log.module}</span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.action}</td>
                      <td style={{ maxWidth: '360px', wordBreak: 'break-word', fontSize: '0.85rem' }}>
                        {log.description}
                      </td>
                      <td>
                        <span
                          className={`system-logs-status-badge ${
                            log.status === 'Success' ? 'success' : 'failed'
                          }`}
                        >
                          {log.status === 'Success' ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}
                          <span>{log.status}</span>
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="system-logs-view-btn"
                          onClick={() => setSelectedLog(log)}
                          title="View Details"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="system-logs-pagination">
              <div>
                Showing page <strong>{pagination.page}</strong> of{' '}
                <strong>{pagination.totalPages}</strong> ({pagination.total} total log records)
              </div>
              <div className="system-logs-pagination-controls">
                <button
                  type="button"
                  className="system-logs-page-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="system-logs-page-btn"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          title="System Audit Log Details"
          onClose={() => setSelectedLog(null)}
          size="lg"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <div className="system-log-modal-grid">
              <div className="system-log-modal-field">
                <label>Log ID</label>
                <p>#{selectedLog.id}</p>
              </div>

              <div className="system-log-modal-field">
                <label>Date & Timestamp</label>
                <p>{formatDateTime(selectedLog.createdAt)}</p>
              </div>

              <div className="system-log-modal-field">
                <label>User / Actor</label>
                <p>
                  {selectedLog.userName} ({selectedLog.userEmail || 'No email'})
                </p>
              </div>

              <div className="system-log-modal-field">
                <label>Role</label>
                <p>
                  <span className={`system-logs-role-tag ${selectedLog.role?.toLowerCase()}`}>
                    {getRoleLabel(selectedLog.role)}
                  </span>
                </p>
              </div>

              <div className="system-log-modal-field">
                <label>Module</label>
                <p>
                  <span className="system-logs-module-pill">{selectedLog.module}</span>
                </p>
              </div>

              <div className="system-log-modal-field">
                <label>Action Performed</label>
                <p style={{ fontWeight: 600 }}>{selectedLog.action}</p>
              </div>

              <div className="system-log-modal-field">
                <label>Status</label>
                <p>
                  <span
                    className={`system-logs-status-badge ${
                      selectedLog.status === 'Success' ? 'success' : 'failed'
                    }`}
                  >
                    {selectedLog.status === 'Success' ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <XCircle size={13} />
                    )}
                    <span>{selectedLog.status}</span>
                  </span>
                </p>
              </div>

              <div className="system-log-modal-field">
                <label>IP Address</label>
                <p>{selectedLog.ipAddress || '127.0.0.1 (Localhost / Internal)'}</p>
              </div>

              {selectedLog.targetId && (
                <div className="system-log-modal-field">
                  <label>Target Entity</label>
                  <p>
                    {selectedLog.targetType || 'Entity'}: #{selectedLog.targetId}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.35rem' }}>
                Description
              </label>
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: 'var(--srcb-table-header-bg, #f8fafc)',
                  border: '1px solid var(--srcb-border, #e2e8f0)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                }}
              >
                {selectedLog.description}
              </div>
            </div>

            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.35rem' }}>
                  Additional Event Metadata (Safe JSON)
                </label>
                <pre className="system-log-json-box">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
