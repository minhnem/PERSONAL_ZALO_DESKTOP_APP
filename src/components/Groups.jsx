import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Groups() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

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

          <button
            onClick={handleSendToMessaging}
            disabled={selectedGroups.size === 0}
            className="px-6 py-2.5 bg-brand text-white font-medium rounded-lg shadow-sm hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
          >
            <span className="mr-2">✉️</span> Chuyển sang Nhắn tin
          </button>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
