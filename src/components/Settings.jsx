import React, { useState, useEffect } from 'react';
import { MdOutlineAdminPanelSettings, MdSettingsApplications, MdAdd, MdRefresh, MdLockOpen, MdLockOutline, MdClose, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import axios from 'axios';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('user-management');

  // --- State Quản lý Người dùng ---
  const [users, setUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);

  // --- State Modal Tạo Tài khoản ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    expireAt: '',
    role: 'user'
  });
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- API Handlers ---

  const getAuthHeaders = () => {
    const token = localStorage.getItem('appToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      const res = await axios.get('http://localhost:3001/api/admin/users', getAuthHeaders());
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert('Phiên đăng nhập hết hạn hoặc không có quyền. Vui lòng đăng nhập lại.');
        window.location.reload();
      } else {
        alert('Lỗi khi tải danh sách người dùng: ' + err.message);
      }
    } finally {
      setIsFetchingUsers(false);
    }
  };



  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    try {
      const res = await axios.post('http://localhost:3001/api/admin/users', newUser, getAuthHeaders());
      if (res.data.success) {
        alert('Tạo tài khoản thành công!');
        setShowCreateModal(false);
        setNewUser({ name: '', username: '', password: '', expireAt: '', role: 'user' });
        fetchUsers(); // Tải lại danh sách
      }
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message || 'Lỗi khi tạo tài khoản');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetMachine = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xoá khóa máy (Machine ID) của người dùng này? Họ sẽ có thể đăng nhập ở máy khác.')) return;
    try {
      const res = await axios.put(`http://localhost:3001/api/admin/users/${id}/reset-machine`, {}, getAuthHeaders());
      if (res.data.success) {
        alert(res.data.message);
        fetchUsers();
      }
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    const actionName = newStatus === 'banned' ? 'KHÓA' : 'MỞ KHÓA';
    if (!window.confirm(`Bạn có chắc muốn ${actionName} tài khoản ${user.username}?`)) return;
    
    try {
      const res = await axios.put(`http://localhost:3001/api/admin/users/${user._id}/status`, { status: newStatus }, getAuthHeaders());
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleExtendLicense = async (id, currentExpireAt) => {
    const dateInput = window.prompt('Nhập ngày hết hạn mới (YYYY-MM-DD):', currentExpireAt ? currentExpireAt.split('T')[0] : '');
    if (!dateInput) return;
    try {
      const res = await axios.put(`http://localhost:3001/api/admin/users/${id}/extend`, { newExpireAt: dateInput }, getAuthHeaders());
      if (res.data.success) {
        alert('Gia hạn thành công!');
        fetchUsers();
      }
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="flex flex-row h-full bg-[#f0f2f5] overflow-hidden">
      {/* Sidebar Setting Tabs */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Cài đặt hệ thống</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MdSettingsApplications size={20} className="mr-3" />
            Cài đặt chung
          </button>
          <button
            onClick={() => setActiveTab('user-management')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'user-management' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MdOutlineAdminPanelSettings size={20} className="mr-3" />
            Quản lý tài khoản
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-white h-full overflow-hidden">
        {activeTab === 'general' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Cài đặt chung</h2>
            <div className="text-gray-500 bg-gray-50 p-6 rounded-xl border border-gray-100">
              Phần cài đặt chung của ứng dụng (đang cập nhật...)
            </div>
          </div>
        )}

        {activeTab === 'user-management' && (
          <div className="flex flex-col h-full relative">
            {/* Header Quản lý tài khoản */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Quản lý Tài khoản (Admin)</h2>
                <p className="text-sm text-gray-500 mt-1">Cấp bản quyền và quản lý tài khoản khách hàng</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  <MdAdd size={18} className="mr-1" />
                  Tạo tài khoản
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {isFetchingUsers ? (
                    <div className="p-10 text-center text-gray-500">Đang tải danh sách...</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                          <th className="px-6 py-4 font-semibold">Khách hàng</th>
                          <th className="px-6 py-4 font-semibold">Tên đăng nhập</th>
                          <th className="px-6 py-4 font-semibold">Vai trò</th>
                          <th className="px-6 py-4 font-semibold">Hạn sử dụng</th>
                          <th className="px-6 py-4 font-semibold">Trạng thái / HWID</th>
                          <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map(user => {
                          const isExpired = new Date(user.expireAt) < new Date();
                          return (
                            <tr key={user._id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-medium text-gray-800">{user.name}</span>
                              </td>
                              <td className="px-6 py-4 text-gray-600">{user.username}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-sm ${isExpired ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}`}>
                                  {new Date(user.expireAt).toLocaleDateString('vi-VN')}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col space-y-1">
                                  <span className={`inline-flex w-fit px-2 py-0.5 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                                  </span>
                                  {user.machineId ? (
                                    <span className="text-[10px] text-gray-400 font-mono" title={user.machineId}>
                                      Đã khóa HWID
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-blue-400">Trống HWID</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => handleExtendLicense(user._id, user.expireAt)} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded">
                                  Gia hạn
                                </button>
                                <button onClick={() => handleResetMachine(user._id)} className="text-orange-600 hover:text-orange-800 text-sm font-medium px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded">
                                  Reset Máy
                                </button>
                                <button onClick={() => handleToggleStatus(user)} className="text-gray-600 hover:text-gray-800 text-sm font-medium px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">
                                  {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {users.length === 0 && (
                          <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">Chưa có người dùng nào.</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
            </div>

            {/* --- MODAL TẠO TÀI KHOẢN --- */}
            {showCreateModal && (
              <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Tạo Tài Khoản Mới</h3>
                    <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <MdClose size={24} />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng</label>
                        <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500" placeholder="VD: Anh Minh..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập (Username)</label>
                        <input type="text" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500" placeholder="VD: minhzalo" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                        <div className="relative">
                          <input 
                            type={showModalPassword ? "text" : "password"} 
                            required 
                            value={newUser.password} 
                            onChange={e => setNewUser({...newUser, password: e.target.value})} 
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg outline-none focus:border-blue-500" 
                            placeholder="••••••••" 
                          />
                          <button
                            type="button"
                            onClick={() => setShowModalPassword(!showModalPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                          >
                            {showModalPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                          <input type="date" required value={newUser.expireAt} onChange={e => setNewUser({...newUser, expireAt: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                          <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500">
                            <option value="user">User thường</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      
                      {createError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{createError}</div>}
                      
                      <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                          Hủy
                        </button>
                        <button type="submit" disabled={isCreating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                          <MdAdd className="mr-1" /> {isCreating ? 'Đang tạo...' : 'Tạo mới'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
