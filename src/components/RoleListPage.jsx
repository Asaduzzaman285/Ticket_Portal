// RoleListPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import Paginate from './Paginate';
import Swal from 'sweetalert2';
import SkeletonLoader from './SkeletonLoader';


const RoleListPage = ({ sidebarVisible = false }) => {
  const [allRoles, setAllRoles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginator, setPaginator] = useState({
    current_page: 1,
    total_pages: 1,
    previous_page_url: null,
    next_page_url: null,
    record_per_page: 10,
    current_page_items_count: 0,
    total_count: 0,
    pagination_last_page: 1
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const dropdownRef = useRef(null);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    paginateRoles(currentPage);
  }, [currentPage, allRoles]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setPermissionsDropdownOpen(false);
      }
      if (actionMenuId !== null) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [actionMenuId]);

  // Group permissions by module (first token)
  const groupPermissions = (permissions) => {
    const groups = {};
    permissions.forEach((p) => {
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
      groups[groupKey].permissions.push({ 
        id: p.id, 
        name: rawName, 
        guard_name: p.guard_name 
      });
    });

    // Convert to array and sort
    const groupArray = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
    groupArray.forEach(g => g.permissions.sort((x, y) => x.name.localeCompare(y.name)));
    
    return groupArray;
  };

  const capitalize = (s) => {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const paginateRoles = (page) => {
    const totalItems = allRoles.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedRoles = allRoles.slice(startIndex, endIndex);

    setRoles(paginatedRoles);
    setPaginator({
      current_page: page,
      total_pages: totalPages,
      previous_page_url: page > 1 ? page - 1 : null,
      next_page_url: page < totalPages ? page + 1 : null,
      record_per_page: ITEMS_PER_PAGE,
      current_page_items_count: paginatedRoles.length,
      total_count: totalItems,
      pagination_last_page: totalPages
    });
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const url = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/role/getAllRoles`;
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
        data?.code === 200 ||
        data?.status === '200';

      const roleList = data?.data?.rolelist ?? data?.rolelist ?? data?.data?.data?.rolelist ?? [];

      if (ok) {
        setAllRoles(Array.isArray(roleList) ? roleList : []);
        setCurrentPage(1);
      } else {
        const msg = data?.message ?? 'Failed to fetch roles';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
        setAllRoles([]);
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Fetch roles error:', err);
      setAllRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      setPermissionsLoading(true);
      const token = localStorage.getItem('authToken');
      const url = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/permission/getAllpermissions`;
      
      console.log('🔍 Fetching permissions from:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('📥 Permissions response:', data);

      const ok =
        data?.status === 'success' ||
        data?.status === 200 ||
        data?.code === 200 ||
        data?.status === '200';

      const permissionList = data?.data?.permissionlist ?? data?.permissionlist ?? data?.data?.data?.permissionlist ?? [];
      
      console.log('📋 Extracted permission list:', permissionList);

      if (ok) {
        const permissions = Array.isArray(permissionList) ? permissionList : [];
        setAllPermissions(permissions);
        // Group permissions by module
        setPermissionGroups(groupPermissions(permissions));
        console.log('✅ Permissions loaded successfully:', permissions.length, 'permissions');
      } else {
        console.error('❌ Failed to fetch permissions:', data?.message);
        setAllPermissions([]);
        setPermissionGroups([]);
      }
    } catch (err) {
      console.error('❌ Fetch permissions error:', err);
      setAllPermissions([]);
      setPermissionGroups([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId) => {
    try {
      const token = localStorage.getItem('authToken');
      const url = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/role/getRole`;
      
      console.log('Fetching role with permissions for role ID:', roleId);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: roleId }),
      });

      const data = await response.json();
      console.log('Role with permissions response:', data);

      const ok =
        data?.status === 'success' ||
        data?.status === 200 ||
        data?.code === 200 ||
        data?.status === '200';

      if (ok) {
        const permissionNames = data?.permissions ?? data?.data?.permissions ?? [];
        console.log('Permission names from backend:', permissionNames);
        
        const permissionIds = [];
        permissionNames.forEach(permName => {
          const found = allPermissions.find(p => p.name === permName);
          if (found) {
            permissionIds.push(Number(found.id));
          }
        });
        
        console.log('✅ Matched permission IDs:', permissionIds);
        return permissionIds;
      } else {
        console.error('Failed to fetch role permissions');
        return [];
      }
    } catch (err) {
      console.error('Fetch role permissions error:', err);
      return [];
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const openCreateModal = () => {
    console.log('Opening create modal. Available permissions:', allPermissions);
    setIsEditing(false);
    setName('');
    setSelectedPermissions([]);
    setSelectedRoleId(null);
    setShowModal(true);
  };

  const openEditModal = async (role) => {
    console.log('Opening edit modal for role:', role);
    
    setIsEditing(true);
    setName(role.name);
    setSelectedRoleId(role.id);
    setShowModal(true);
    
    const permissionIds = await fetchRolePermissions(role.id);
    console.log('Setting selected permissions:', permissionIds);
    setSelectedPermissions(permissionIds);
  };

  // Permission selection handlers for grouped permissions
  const togglePermissionSelection = (permissionId) => {
    console.log('Toggling permission:', permissionId, 'Current selected:', selectedPermissions);
    setSelectedPermissions(prev => {
      const newSelection = prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId) 
        : [...prev, permissionId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
  };

  const handleGroupToggle = (group) => {
    const permissionIds = group.permissions.map(p => Number(p.id));
    const allSelected = permissionIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      // Remove all permissions in the group
      setSelectedPermissions(prev => prev.filter(id => !permissionIds.includes(id)));
    } else {
      // Add all permissions in the group that are not already selected
      setSelectedPermissions(prev => {
        const newSelection = [...prev];
        permissionIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const isGroupFullySelected = (group) => {
    return group.permissions.every(p => selectedPermissions.includes(Number(p.id)));
  };

  const isGroupPartiallySelected = (group) => {
    const selectedCount = group.permissions.filter(p => selectedPermissions.includes(Number(p.id))).length;
    return selectedCount > 0 && selectedCount < group.permissions.length;
  };

  const removePermissionTag = (permissionId) => {
    console.log('Removing permission tag:', permissionId);
    setSelectedPermissions(prev => prev.filter(id => id !== permissionId));
  };

  const getPermissionNameById = (permissionId) => {
    const permission = allPermissions.find(p => Number(p.id) === Number(permissionId));
    const name = permission ? permission.name : 'Unknown';
    console.log('Getting permission name for ID:', permissionId, 'Result:', name);
    return name;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Name is required',
        confirmButtonColor: '#007bff',
      });
      return;
    }

    try {
      setModalLoading(true);
      const token = localStorage.getItem('authToken');
      let url;
      let body;

      // Convert permission IDs to permission names
      const permissionNames = selectedPermissions.map(id => {
        const permission = allPermissions.find(p => Number(p.id) === Number(id));
        return permission ? permission.name : null;
      }).filter(Boolean);
      
      if (isEditing) {
        url = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/role/updateRole`;
        body = { 
          id: selectedRoleId, 
          name: name.trim(),
          guard_name: 'web', 
          permissions: permissionNames
        };
      } else {
        url = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/role/createRole`;
        body = { 
          name: name.trim(),
          guard_name: 'web', 
          permissions: permissionNames
        };
      }

      console.log('🚀 Submitting role with payload:', JSON.stringify(body, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('📥 Submit response:', data);

      const ok =
        data?.status === 'success' ||
        data?.status === 200 ||
        data?.code === 200 ||
        data?.status === '200';

      if (ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: isEditing ? 'Role updated successfully' : 'Role created successfully',
          confirmButtonColor: '#007bff',
          timer: 3000,
          timerProgressBar: true
        });
        setShowModal(false);
        fetchRoles();
      } else {
        const msg = data?.message ?? (isEditing ? 'Failed to update role' : 'Failed to create role');
        const errorDetails = data?.errors ? JSON.stringify(data.errors, null, 2) : '';
        
        console.error('❌ API Error:', {
          message: msg,
          errors: data?.errors,
          fullResponse: data
        });
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          html: `
            <p>${Array.isArray(msg) ? msg.join('<br>') : msg}</p>
            ${errorDetails ? `<pre style="text-align: left; font-size: 11px; background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow: auto;">${errorDetails}</pre>` : ''}
            <p style="margin-top: 10px; font-size: 12px; color: #666;">Check console for full payload details</p>
          `,
          confirmButtonColor: '#007bff',
        });
      }
    } catch (err) {
      console.error('Role submit error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error connecting to server: ' + err.message,
        confirmButtonColor: '#007bff',
      });
    } finally {
      setModalLoading(false);
    }
  };

  const renderPagination = () => {
    return (
      <Paginate
        paginator={paginator}
        currentPage={currentPage}
        pagechanged={handlePageChange}
      />
    );
  };

  const containerStyle = sidebarVisible
    ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
    : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

  return (
    <div style={containerStyle}>
      {/* Header with Breadcrumb */}
      <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Roles</h1>
        <div style={{ fontSize: '13px', color: '#555' }}>
          <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
            Home
          </span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
            Access Control
          </span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Manage Roles</span>
        </div>
      </div>

      {/* Error Message */}
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

      {/* Card Container */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '10px'
      }}>
        {/* Create Button Section */}
        <div style={{ display: 'flex', justifyContent: 'start', alignItems: 'center', marginBottom: '10px' }}>
          <button
            onClick={openCreateModal}
            disabled={permissionsLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              background: permissionsLoading ? '#ccc' : 'linear-gradient(45deg, #007bff, #0056b3)',
              color: 'white',
              border: 'none',
              cursor: permissionsLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} />
            {permissionsLoading ? 'Loading...' : 'Create New Role'}
          </button>
          {permissionsLoading && (
            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
              Loading permissions...
            </span>
          )}
        </div>

        {/* Table */}
        <table className="table table-bordered table-hover table-sm align-middle" style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <thead className="table-light">
            <tr>
              <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
              <th className="py-2 px-3 fw-semibold text-start">Name</th>
              <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonLoader type="table" count={ITEMS_PER_PAGE} columns={3} />
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center text-muted py-12">
                  No roles found. Create your first role to get started.
                </td>
              </tr>
            ) : (
              roles.map((role, index) => (
                <tr key={role.id} className="align-middle">
                  <td className="py-1 px-3 text-center">
                    {paginator?.current_page > 1
                      ? (paginator?.current_page - 1) * paginator?.record_per_page + index + 1
                      : index + 1}
                  </td>
                  <td className="py-1 px-3">
                    <div style={{ fontWeight: '600', color: '#333' }}>{role.name}</div>
                  </td>
                  <td className="py-1 px-3 text-center position-relative">
                    <button
                      className="btn btn-link p-0"
                      style={{ fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuId(actionMenuId === role.id ? null : role.id);
                      }}
                    >
                      <i className="fa-solid fa-ellipsis-v"></i>
                    </button>

                    {actionMenuId === role.id && (
                      <div
                        className="position-absolute bg-white border rounded shadow-sm py-1"
                        style={{
                          top: '24px',
                          right: '10px',
                          zIndex: 10,
                          minWidth: '90px',
                          fontSize: '12px',
                          lineHeight: '1.1',
                        }}
                      >
                        <button
                          onClick={() => openEditModal(role)}
                          className="dropdown-item py-0 px-2 d-flex align-items-center"
                          style={{ fontSize: '12px', height: '24px' }}
                        >
                          <Edit size={12} style={{ marginRight: '6px' }} />
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Info */}
        {!loading && (
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            Showing {paginator.current_page_items_count > 0 ? (paginator.current_page - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(paginator.current_page * ITEMS_PER_PAGE, paginator.total_count)} of {paginator.total_count} results
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && paginator?.total_pages > 1 && (
          <div style={{ marginTop: '-20px' }}>
            {renderPagination()}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
              width: "95%",
              maxWidth: "900px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                {isEditing ? "Update Role" : "Create New Role"}
              </h5>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderBottom: "1px solid #e5e7eb" }} />
            
            {/* Body */}
            <div style={{ padding: "14px", overflowY: "auto", flex: 1 }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-4"></div>
                  <p className="text-gray-600">Saving...</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  {/* Name */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontWeight: "500",
                        fontSize: "13px",
                      }}
                    >
                      Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter role name"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  
                 {/* Permissions - Now spans full width with module grouping */}
                 <div style={{ gridColumn: '1 / -1' }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "13px",
                      }}
                    >
                      Permissions (select one or more)
                    </label>
                    
                    {/* ALWAYS VISIBLE PERMISSIONS SECTION */}
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        background: "white",
                        borderRadius: "6px",
                        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                        padding: "16px",
                        maxHeight: "400px",
                        overflowY: "auto"
                      }}
                    >
                      {permissionsLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <SkeletonLoader type="text" count={3} />
                        </div>
                      ) : permissionGroups.length === 0 ? (
                        <div style={{ padding: "6px", color: "#999" }}>
                          No permissions found
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                          gap: '16px'
                        }}>
                          {permissionGroups.map((group) => (
                            <div key={group.key} style={{
                              backgroundColor: '#f8f9fa',
                              borderRadius: "6px",
                              padding: "16px",
                              border: "1px solid #e9ecef"
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '12px' 
                              }}>
                                <h4 style={{ 
                                  fontWeight: '600', 
                                  color: '#333', 
                                  fontSize: '13px', 
                                  margin: 0 
                                }}>
                                  {group.label}
                                </h4>
                                <label style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  cursor: 'pointer', 
                                  margin: 0 
                                }}>
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
                                  />
                                  <span style={{ 
                                    marginLeft: '6px', 
                                    fontSize: '11px', 
                                    color: '#666' 
                                  }}>
                                    All
                                  </span>
                                </label>
                              </div>

                              <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '8px' 
                              }}>
                                {group.permissions.map((permission) => {
                                  const isChecked = selectedPermissions.includes(Number(permission.id));
                                  return (
                                    <label
                                      key={permission.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 10px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        background: isChecked ? "#e8f1ff" : "#f8f9fa",
                                        border: `1px solid ${isChecked ? "#007bff" : "#e5e7eb"}`,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePermissionSelection(Number(permission.id))}
                                        style={{ width: "14px", height: "14px" }}
                                      />
                                      {permission.name}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                      {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            {!modalLoading && (
              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    background: "linear-gradient(45deg,#007bff,#0056b3)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .inline-block {
          display: inline-block;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .rounded-full {
          border-radius: 9999px;
        }
        
        .h-8 {
          height: 2rem;
        }
        
        .w-8 {
          width: 2rem;
        }
        
        .border-b-2 {
          border-bottom-width: 2px;
        }
        
        .border-teal-500 {
          border-color: #14b8a6;
        }
        
        .mb-4 {
          margin-bottom: 1rem;
        }
        
        .text-gray-600 {
          color: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default RoleListPage;