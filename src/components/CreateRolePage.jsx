import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * CreateRolePage.jsx
 * - fetches permissions from /api/v1/permission/getAllpermissions
 * - groups permissions by first token (e.g. 'user create' -> group 'User')
 * - allows select/deselect per permission and per group
 * - posts to /api/v1/role/createRole with body { name, guard_name, permissions: [names] }
 */

const CreateRolePage = ({ sidebarVisible = false }) => {
  const [roleName, setRoleName] = useState('');
  const [guardName, setGuardName] = useState('web');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]); // [{ key, label, permissions: [{ id, name }] }]
  const [loading, setLoading] = useState(false);
  const [fetchingPermissions, setFetchingPermissions] = useState(true);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setFetchingPermissions(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/permission/getAllpermissions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      const ok =
        data?.status === 'success' ||
        data?.status === 200 ||
        data?.code === 200;

      const permissionList = data?.data?.permissionlist ?? data?.permissionlist ?? [];

      if (!ok) {
        const msg = data?.message ?? 'Failed to fetch permissions';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
        setPermissionGroups([]);
        return;
      }

      // permissionList is array like { id, name, guard_name }
      // Group by first token (before space). Fallback to 'Other'
      const groups = {};
      permissionList.forEach((p) => {
        const rawName = (p.name || '').trim();
        if (!rawName) return;
        const firstToken = rawName.split(' ')[0].toLowerCase();
        const groupKey = firstToken || 'other';
        if (!groups[groupKey]) {
          groups[groupKey] = {
            key: groupKey,
            label: capitalize(firstToken),
            permissions: []
          };
        }
        groups[groupKey].permissions.push({ id: p.id, name: rawName, guard_name: p.guard_name });
      });

      // Convert to array and sort groups and permissions for nicer UI
      const groupArray = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
      groupArray.forEach(g => g.permissions.sort((x, y) => x.name.localeCompare(y.name)));

      setPermissionGroups(groupArray);
      setError(null);
    } catch (err) {
      console.error('Fetch permissions error:', err);
      setError('Error loading permissions');
      setPermissionGroups([]);
    } finally {
      setFetchingPermissions(false);
    }
  };

  const capitalize = (s) => {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const handlePermissionToggle = (permissionName) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionName)) {
        return prev.filter(p => p !== permissionName);
      } else {
        return [...prev, permissionName];
      }
    });
  };

  const handleGroupToggle = (group) => {
    const names = group.permissions.map(p => p.name);
    const allSelected = names.every(n => selectedPermissions.includes(n));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !names.includes(p)));
    } else {
      setSelectedPermissions(prev => {
        const copy = [...prev];
        names.forEach(n => { if (!copy.includes(n)) copy.push(n); });
        return copy;
      });
    }
  };

  const isGroupFullySelected = (group) => {
    return group.permissions.every(p => selectedPermissions.includes(p.name));
  };

  const isGroupPartiallySelected = (group) => {
    const selCount = group.permissions.filter(p => selectedPermissions.includes(p.name)).length;
    return selCount > 0 && selCount < group.permissions.length;
  };

  const validateForm = () => {
    const errors = [];
    if (!roleName.trim()) errors.push('Role name is required');
    if (!guardName.trim()) errors.push('Guard name is required');
    if (selectedPermissions.length === 0) errors.push('Please select at least one permission');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/role/createRole`;

      const payload = {
        name: roleName.trim(),
        guard_name: guardName.trim(),
        permissions: selectedPermissions
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      const ok =
        data?.status === 'success' ||
        data?.status === 200 ||
        data?.code === 200;

      if (ok) {
        alert('Role created successfully!');
        window.location.href = '/admin/roles';
      } else {
        if (data?.status === 422 || data?.code === 422) {
          // validation errors
          const msgs = data?.message ?? data?.errors ?? 'Validation failed';
          if (Array.isArray(msgs)) {
            setValidationErrors(msgs);
          } else if (typeof msgs === 'object') {
            const flat = Object.values(msgs).flat();
            setValidationErrors(flat);
          } else {
            setError(Array.isArray(msgs) ? msgs.join(', ') : msgs);
          }
        } else {
          const msg = data?.message ?? 'Failed to create role';
          setError(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      }
    } catch (err) {
      console.error('Create role error:', err);
      setError('Error creating role: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      window.location.href = '/admin/roles';
    }
  };

  const containerStyle = sidebarVisible
    ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
    : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

  if (fetchingPermissions) {
    return (
      <div style={containerStyle}>
        <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Create Role</h1>
          <div style={{ fontSize: '13px', color: '#555' }}>
            <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
              Home
            </span>
            <span style={{ margin: '0 8px' }}>/</span>
            <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/roles'}>
              Roles
            </span>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Create Role</span>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header with Breadcrumb */}
      <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => window.location.href = '/admin/roles'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Back to roles"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Create New Role</h1>
        </div>
        <div style={{ fontSize: '13px', color: '#555' }}>
          <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
            Home
          </span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/roles'}>
            Roles
          </span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Create Role</span>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '11px',
          borderRadius: '4px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
        }}>
          <p style={{ margin: 0, fontWeight: '500' }}>{error}</p>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '11px',
          borderRadius: '4px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
        }}>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Form Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '20px'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px', color: '#333' }}>
            Name<span style={{ color: 'red', marginLeft: '4px' }}>*</span>
          </label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Role name"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
            disabled={loading}
          />
        </div>

        <input type="hidden" value={guardName} />

        <div style={{ marginBottom: '20px' }}>
          <div style={{
            backgroundColor: '#fff5f5',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #fed7d7'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#333', margin: 0 }}>
              Select Permissions<span style={{ color: 'red', marginLeft: '4px' }}>*</span>
            </h3>
          </div>

          <div style={{ marginBottom: '16px', fontSize: '12px', color: '#666' }}>
            {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {permissionGroups.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#666' }}>No permissions available</div>
            ) : permissionGroups.map((group) => (
              <div key={group.key} style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                padding: '16px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontWeight: '600', color: '#333', fontSize: '13px', margin: 0 }}>{group.label}</h4>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={isGroupFullySelected(group)}
                      ref={input => {
                        if (input) {
                          input.indeterminate = isGroupPartiallySelected(group);
                        }
                      }}
                      onChange={() => handleGroupToggle(group)}
                      style={{
                        width: '14px',
                        height: '14px',
                        margin: 0,
                        cursor: 'pointer'
                      }}
                      disabled={loading}
                    />
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: '#666' }}>All</span>
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.permissions.map((permission) => (
                    <label
                      key={permission.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: '2px',
                        margin: 0,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.name)}
                        onChange={() => handlePermissionToggle(permission.name)}
                        style={{
                          width: '14px',
                          height: '14px',
                          margin: 0,
                          cursor: 'pointer'
                        }}
                        disabled={loading}
                      />
                      <span style={{ fontSize: '12px', color: '#333' }}>{permission.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '20px',
          borderTop: '1px solid #e9ecef'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 20px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: '#333',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
            disabled={loading}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1,
              background: 'linear-gradient(45deg, #007bff, #0056b3)'
            }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRolePage;
