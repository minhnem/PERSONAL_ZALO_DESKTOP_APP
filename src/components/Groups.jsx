import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Groups() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isScanningGroups, setIsScanningGroups] = useState(false);
  const [isScanningGroupsApi, setIsScanningGroupsApi] = useState(false);

  // States cho Thành viên nhóm
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isScanningMembers, setIsScanningMembers] = useState(false);
  const [isScanningMembersApi, setIsScanningMembersApi] = useState(false);

  const navigate = useNavigate();

  // 1. Fetch Accounts on Mount
  useEffect(() => {
    axios.get('http://localhost:3001/api/accounts')
      .then(res => {
        if (res.data.success) {
          setAccounts(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedAccountId(res.data.data[0].phoneNumber);
          }
        }
      })
      .catch(err => console.error('Lỗi tải danh sách tài khoản:', err));
  }, []);

  // 2. Fetch Groups when selectedAccountId changes
  useEffect(() => {
    if (!selectedAccountId) {
      setGroups([]);
      setSelectedGroups(new Set());
      return;
    }

    setIsLoadingGroups(true);
    axios.get(`http://localhost:3001/api/groups/${selectedAccountId}`)
      .then(res => {
        if (res.data.success) {
          setGroups(res.data.data);
          setSelectedGroups(new Set()); // Reset selection
        }
      })
      .catch(err => console.error('Lỗi tải danh sách nhóm:', err))
      .finally(() => setIsLoadingGroups(false));
  }, [selectedAccountId]);

  const handleSelectAll = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(g => g._id))); // Use _id or zaloId
    }
  };

  const handleToggleGroup = (id) => {
    const newSet = new Set(selectedGroups);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedGroups(newSet);
  };

  const handleSendToMessaging = () => {
    if (selectedGroups.size === 0) return alert('Vui lòng chọn ít nhất 1 nhóm!');

    const selectedList = groups.filter(g => selectedGroups.has(g._id));

    // Lưu vào localStorage
    const dataToPass = {
      accountId: selectedAccountId,
      source: 'groups',
      contacts: selectedList.map(g => ({ id: g.zaloId, name: g.name }))
    };

    localStorage.setItem('messagingTarget', JSON.stringify(dataToPass));
    navigate('/');
  };

  const handleScanGroups = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản');
    try {
      setIsScanningGroups(true);
      const res = await axios.post('http://localhost:3001/api/accounts/sync-groups', {
        accountId: selectedAccountId
      });
      if (res.data.success) {
        alert('Đã quét và đồng bộ nhóm thành công!');
        // Refresh groups
        const groupsRes = await axios.get(`http://localhost:3001/api/groups/${selectedAccountId}`);
        if (groupsRes.data.success) setGroups(groupsRes.data.data);
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Gửi lệnh thất bại: ' + err.message);
    } finally {
      setIsScanningGroups(false);
    }
  };

  const handleScanGroupsViaApi = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản');
    try {
      setIsScanningGroupsApi(true);
      const res = await axios.post('http://localhost:3001/api/accounts/sync-groups-v2', {
        accountId: selectedAccountId
      });
      if (res.data.success) {
        alert('Đã quét và đồng bộ nhóm qua API thành công!');
        // Refresh groups
        const groupsRes = await axios.get(`http://localhost:3001/api/groups/${selectedAccountId}`);
        if (groupsRes.data.success) setGroups(groupsRes.data.data);
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Gửi lệnh API thất bại: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsScanningGroupsApi(false);
    }
  };

  const fetchGroupMembers = (groupId, groupName, groupZaloId) => {
    setActiveGroup({ id: groupId, name: groupName, zaloId: groupZaloId });
    setIsLoadingMembers(true);
    setGroupMembers([]);
    setSelectedMembers(new Set());
    axios.get(`http://localhost:3001/api/groups/${groupId}/members`)
      .then(res => {
        if (res.data.success) {
          setGroupMembers(res.data.data);
        }
      })
      .catch(err => console.error('Lỗi tải danh sách thành viên:', err))
      .finally(() => setIsLoadingMembers(false));
  };

  const handleSyncMembers = () => {
    if (!activeGroup) return;
    setIsScanningMembers(true);
    axios.post('http://localhost:3001/api/accounts/sync-group-members', {
      accountId: selectedAccountId,
      groupId: activeGroup.id,
      groupName: activeGroup.name
    })
      .then(res => {
        if (res.data.success) {
          fetchGroupMembers(activeGroup.id, activeGroup.name, activeGroup.zaloId);
        }
      })
      .catch(err => {
        alert('Lỗi quét thành viên: ' + (err.response?.data?.error || err.message));
      })
      .finally(() => setIsScanningMembers(false));
  };

  // Quét thành viên bằng zca-js API (nhanh, có UID thật, kể cả ẩn)
  const handleSyncMembersViaApi = () => {
    if (!activeGroup) return;
    setIsScanningMembersApi(true);
    axios.post('http://localhost:3001/api/accounts/sync-group-members-v2', {
      accountId: selectedAccountId,
      groupId: activeGroup.zaloId // Dùng zaloId thật của nhóm
    })
      .then(res => {
        if (res.data.success) {
          alert(res.data.message);
          fetchGroupMembers(activeGroup.id, activeGroup.name, activeGroup.zaloId);
        }
      })
      .catch(err => {
        alert('Lỗi quét API: ' + (err.response?.data?.error || err.message));
      })
      .finally(() => setIsScanningMembersApi(false));
  };

  const handleSelectAllMembers = () => {
    if (selectedMembers.size === groupMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(groupMembers.map(m => m.id)));
    }
  };

  const handleToggleMember = (id) => {
    const newSet = new Set(selectedMembers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedMembers(newSet);
  };

  const handleSendMembersToMessaging = () => {
    if (selectedMembers.size === 0) return alert('Vui lòng chọn ít nhất 1 người!');

    const selectedList = groupMembers.filter(m => selectedMembers.has(m.id));

    const dataToPass = {
      accountId: selectedAccountId,
      source: 'group_members',
      groupName: activeGroup.name, // Quan trọng để Playwright biết gửi từ nhóm nào
      contacts: selectedList.map(m => ({ id: m.id, name: m.name }))
    };

    localStorage.setItem('messagingTarget', JSON.stringify(dataToPass));
    navigate('/');
  };

  return (
    <div className="h-full flex gap-6 p-6">

      {/* LEFT COLUMN: ACCOUNTS LIST */}
      <div className="w-[300px] shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800 text-lg flex items-center">
            <span className="text-blue-500 mr-2">👥</span> Tài khoản Zalo
          </h2>
          <p className="text-xs text-gray-500 mt-1">Chọn tài khoản để xem Nhóm</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {accounts.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 italic">Chưa có tài khoản nào</div>
          ) : (
            accounts.map(acc => (
              <div
                key={acc.phoneNumber}
                onClick={() => setSelectedAccountId(acc.phoneNumber)}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedAccountId === acc.phoneNumber
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-shrink-0 items-center justify-center font-bold text-gray-600 overflow-hidden mr-3">
                  {acc.avatar ? <img src={acc.avatar} className="w-full h-full object-cover" /> : (acc.name ? acc.name.charAt(0) : 'Z')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{acc.name || acc.phoneNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{acc.phoneNumber}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: GROUPS TABLE */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
        {/* Header & Actions */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Danh sách Nhóm</h2>
            <p className="text-sm text-gray-600 mt-1">
              {groups.length} nhóm | Đã chọn: <span className="font-bold text-blue-600">{selectedGroups.size}</span>
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={handleScanGroups}
              disabled={isScanningGroups || isScanningGroupsApi}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center"
            >
              {isScanningGroups ? '⏳ Đang quét...' : '🤖 Quét Nhóm'}
            </button>
            <button
              onClick={handleScanGroupsViaApi}
              disabled={isScanningGroups || isScanningGroupsApi}
              className="px-4 py-2.5 bg-purple-100 text-purple-700 font-medium rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-all flex items-center"
              title="Quét bằng API: nhanh hơn và có ID thật"
            >
              {isScanningGroupsApi ? '⏳ Đang quét API...' : '⚡ Quét Nhóm API'}
            </button>
            <button
              onClick={handleSendToMessaging}
              disabled={selectedGroups.size === 0}
              className="px-6 py-2.5 bg-brand text-white font-medium rounded-lg shadow-sm hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
            >
              <span className="mr-2">✉️</span> Chuyển sang Nhắn tin
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {isLoadingGroups ? (
            <div className="p-20 flex justify-center text-gray-400">Đang tải danh sách nhóm...</div>
          ) : !selectedAccountId ? (
            <div className="p-20 text-center text-gray-500">Vui lòng chọn tài khoản ở cột bên trái</div>
          ) : groups.length === 0 ? (
            <div className="p-20 text-center text-gray-500">
              Tài khoản này chưa quét được nhóm nào.<br />
              Vui lòng qua tab "Tài khoản Zalo", bấm nút Quét Nhóm để đồng bộ.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 text-sm sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 text-center border-b border-gray-200">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                      checked={groups.length > 0 && selectedGroups.size === groups.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 border-b border-gray-200 w-16">Avatar</th>
                  <th className="p-3 border-b border-gray-200 font-semibold">Tên Nhóm</th>
                  <th className="p-3 border-b border-gray-200 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-800">
                {groups.map((group) => (
                  <tr
                    key={group._id}
                    onClick={() => handleToggleGroup(group._id)}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedGroups.has(group._id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                        checked={selectedGroups.has(group._id)}
                        readOnly
                      />
                    </td>
                    <td className="p-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gray-200 text-gray-600 overflow-hidden">
                        {group.avatar ? <img src={group.avatar} className="w-full h-full object-cover" /> : (group.name || 'G').charAt(0)}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-base">{group.name}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn click vào row
                          fetchGroupMembers(group._id, group.name, group.zaloId);
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                      >
                        👀 Xem Thành viên
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MEMBERS MODAL */}
      {activeGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-[450px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{activeGroup.name}</h3>
                <p className="text-sm text-gray-500">{groupMembers.length} thành viên | Đã chọn: <span className="font-bold text-blue-600">{selectedMembers.size}</span></p>
              </div>
              <button onClick={() => setActiveGroup(null)} className="text-gray-400 hover:text-red-500 transition-colors text-xl font-bold px-2">
                ✕
              </button>
            </div>
            
            <div className="p-3 border-b border-gray-100 flex gap-2">
              <button 
                onClick={handleSyncMembers}
                disabled={isScanningMembers || isScanningMembersApi}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center transition-colors"
              >
                {isScanningMembers ? '⏳ Đang quét...' : '🔄 Quét (Playwright)'}
              </button>
              <button 
                onClick={handleSyncMembersViaApi}
                disabled={isScanningMembers || isScanningMembersApi}
                className="flex-1 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center transition-colors"
                title="Quét bằng API: nhanh hơn, có UID thật, kể cả thành viên ẩn"
              >
                {isScanningMembersApi ? '⏳ Đang quét...' : '⚡ Quét bằng API'}
              </button>
              <button 
                onClick={handleSendMembersToMessaging}
                disabled={selectedMembers.size === 0}
                className="flex-1 py-2 bg-brand hover:bg-brand/90 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
              >
                ✉️ Nhắn tin
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {isLoadingMembers ? (
                <div className="text-center p-10 text-gray-400">Đang tải...</div>
              ) : groupMembers.length === 0 ? (
                <div className="text-center p-10 text-gray-500">
                  <p>Chưa có dữ liệu thành viên.</p>
                  <p className="text-sm mt-2">Bấm nút "Quét cập nhật" để lấy danh sách từ Zalo.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center p-2 mb-2 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 mr-3 rounded border-gray-300 text-brand focus:ring-brand"
                      checked={groupMembers.length > 0 && selectedMembers.size === groupMembers.length}
                      onChange={handleSelectAllMembers}
                    />
                    <span className="text-sm font-medium text-gray-600">Chọn tất cả</span>
                  </div>
                  {groupMembers.map(m => (
                    <div 
                      key={m.id}
                      onClick={() => handleToggleMember(m.id)}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${selectedMembers.has(m.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <input 
                        type="checkbox"
                        className="w-4 h-4 mr-3 rounded border-gray-300 text-brand focus:ring-brand"
                        checked={selectedMembers.has(m.id)}
                        readOnly
                      />
                      <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden">
                        {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : (m.name ? m.name.charAt(0) : '?')}
                      </div>
                      <div className="flex-1 min-w-0 truncate">
                        <span className="text-sm font-medium text-gray-800">{m.name}</span>
                        {m.id && !m.id.startsWith('zalo_id_mem_') && (
                          <span className="ml-2 text-xs text-purple-500 font-mono" title={`UID: ${m.id}`}>⚡ UID</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
