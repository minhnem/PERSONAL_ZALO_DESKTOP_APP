import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Friends() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isScanningContacts, setIsScanningContacts] = useState(false);
  const [isScanningApi, setIsScanningApi] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  
  const [activeTab, setActiveTab] = useState('friends');
  const [blacklist, setBlacklist] = useState([]);
  
  // State cho phần thêm bạn qua SĐT
  const [phoneNumbersInput, setPhoneNumbersInput] = useState('');
  const [addPhoneMessage, setAddPhoneMessage] = useState('Chào {first_name}, mình kết bạn nhé!');
  const [isSendingPhoneReq, setIsSendingPhoneReq] = useState(false);

  const navigate = useNavigate();

  // Lọc contact cho tab friends
  const blacklistIds = new Set(blacklist.map(b => b.contactId));
  const validContacts = contacts.filter(c => !blacklistIds.has(c.id));

  const availableTags = [...new Set(validContacts.flatMap(c => c.tags || []))].filter(Boolean);
  const filteredContacts = validContacts.filter(c => {
    if (!selectedTagFilter) return true;
    return c.tags && c.tags.includes(selectedTagFilter);
  });

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

  // 2. Fetch Contacts when selectedAccountId changes
  useEffect(() => {
    if (!selectedAccountId) {
      setContacts([]);
      setBlacklist([]);
      setSelectedContacts(new Set());
      return;
    }

    setIsLoadingContacts(true);
    Promise.all([
      axios.get(`http://localhost:3001/api/contacts?accountId=${selectedAccountId}`),
      axios.get(`http://localhost:3001/api/blacklist?accountId=${selectedAccountId}`)
    ])
      .then(([contactsRes, blacklistRes]) => {
        if (contactsRes.data.success) {
          setContacts(contactsRes.data.data);
        }
        if (blacklistRes.data.success) {
          setBlacklist(blacklistRes.data.data);
        }
        setSelectedContacts(new Set());
        setSelectedTagFilter('');
      })
      .catch(err => console.error('Lỗi tải danh bạ:', err))
      .finally(() => setIsLoadingContacts(false));
  }, [selectedAccountId]);

  const handleSelectAll = () => {
    const currentFilteredIds = filteredContacts.map(c => c.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every(id => selectedContacts.has(id));
    
    if (allSelected) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(currentFilteredIds));
    }
  };

  const handleToggleContact = (id) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContacts(newSet);
  };

  const handleAddToBlacklist = async (contact) => {
    if (!window.confirm(`Bạn có chắc muốn chặn ${contact.name}?`)) return;
    try {
      const res = await axios.post('http://localhost:3001/api/blacklist', {
        accountId: selectedAccountId,
        contactId: contact.id,
        name: contact.name,
        avatar: contact.avatar
      });
      if (res.data.success) {
        setBlacklist([res.data.data, ...blacklist]);
        const newSelected = new Set(selectedContacts);
        newSelected.delete(contact.id);
        setSelectedContacts(newSelected);
      }
    } catch (err) {
      alert('Lỗi thêm blacklist: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveFromBlacklist = async (contactId) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ chặn người này?`)) return;
    try {
      const res = await axios.delete(`http://localhost:3001/api/blacklist/${contactId}?accountId=${selectedAccountId}`);
      if (res.data.success) {
        setBlacklist(blacklist.filter(b => b.contactId !== contactId));
      }
    } catch (err) {
      alert('Lỗi gỡ chặn: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSendToMessaging = () => {
    if (selectedContacts.size === 0) return alert('Vui lòng chọn ít nhất 1 người!');

    const selectedList = contacts.filter(c => selectedContacts.has(c.id));

    // Lưu vào localStorage
    const dataToPass = {
      accountId: selectedAccountId,
      source: 'friends',
      contacts: selectedList.map(c => ({ id: c.id, name: c.name }))
    };

    localStorage.setItem('messagingTarget', JSON.stringify(dataToPass));
    navigate('/');
  };

  const handleScanContacts = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản');
    try {
      setIsScanningContacts(true);
      const res = await axios.post('http://localhost:3001/api/accounts/sync', {
        accountId: selectedAccountId
      });
      if (res.data.success) {
        alert('Đã quét và đồng bộ danh bạ thành công!');
        // Refresh danh bạ
        const contactsRes = await axios.get(`http://localhost:3001/api/contacts?accountId=${selectedAccountId}`);
        if (contactsRes.data.success) {
          setContacts(contactsRes.data.data);
          setSelectedContacts(new Set());
          setSelectedTagFilter('');
        }
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Gửi lệnh thất bại: ' + err.message);
    } finally {
      setIsScanningContacts(false);
    }
  };

  // Quét danh bạ bằng zca-js API (nhanh, có UID thật)
  const handleScanViaApi = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản');
    try {
      setIsScanningApi(true);
      const res = await axios.post('http://localhost:3001/api/accounts/sync-v2', {
        accountId: selectedAccountId
      });
      if (res.data.success) {
        alert(res.data.message);
        // Refresh danh bạ
        const contactsRes = await axios.get(`http://localhost:3001/api/contacts?accountId=${selectedAccountId}`);
        if (contactsRes.data.success) {
          setContacts(contactsRes.data.data);
          setSelectedContacts(new Set());
          setSelectedTagFilter('');
        }
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Quét API thất bại: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsScanningApi(false);
    }
  };

  const handleSendFriendRequestByPhone = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản Zalo gửi lời mời!');
    if (!phoneNumbersInput.trim()) return alert('Vui lòng nhập ít nhất 1 số điện thoại!');
    
    // Tách SĐT bằng xuống dòng hoặc dấu phẩy
    const rawPhones = phoneNumbersInput.split(/[\n,]+/);
    const phoneNumbers = rawPhones.map(p => p.trim()).filter(p => p.length >= 9);

    if (phoneNumbers.length === 0) return alert('Không tìm thấy số điện thoại hợp lệ!');

    setIsSendingPhoneReq(true);
    try {
      const res = await axios.post('http://localhost:3001/api/send-friend-by-phone', {
        accountId: selectedAccountId,
        phoneNumbers,
        message: addPhoneMessage
      });
      if (res.data.success) {
        alert(`Thành công! Đã lên lịch gửi kết bạn cho ${phoneNumbers.length} số điện thoại.`);
        setPhoneNumbersInput(''); // Xóa trắng ô nhập sau khi gửi
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Gửi yêu cầu thất bại: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSendingPhoneReq(false);
    }
  };

  return (
    <div className="h-full flex gap-6 p-6">

      {/* LEFT COLUMN: ACCOUNTS LIST */}
      <div className="w-[300px] shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800 text-lg flex items-center">
            <span className="text-blue-500 mr-2">👥</span> Tài khoản Zalo
          </h2>
          <p className="text-xs text-gray-500 mt-1">Chọn tài khoản để xem Bạn bè</p>
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

      {/* RIGHT COLUMN: CONTACTS TABLE */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'friends' ? 'text-brand border-b-2 border-brand bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Danh sách bạn bè
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'blacklist' ? 'text-red-500 border-b-2 border-red-500 bg-red-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Danh sách không nhận tin
          </button>
          <button
            onClick={() => setActiveTab('add_by_phone')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'add_by_phone' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            ⚡ Kết bạn qua SĐT
          </button>
        </div>

        {/* Header & Actions */}
        {activeTab !== 'add_by_phone' && (
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">
                {activeTab === 'friends' ? 'Danh bạ Bạn bè' : 'Danh sách Không nhận tin'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === 'friends' ? (
                  <>{filteredContacts.length} liên hệ | Đã chọn: <span className="font-bold text-blue-600">{selectedContacts.size}</span></>
                ) : (
                  <>{blacklist.length} liên hệ bị chặn</>
                )}
              </p>
            </div>

          {activeTab === 'friends' && (
            <div className="flex gap-3 items-center">
            {availableTags.length > 0 && (
              <select
                value={selectedTagFilter}
                onChange={(e) => {
                  setSelectedTagFilter(e.target.value);
                  setSelectedContacts(new Set());
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Tất cả phân loại</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleScanContacts}
              disabled={isScanningContacts || isScanningApi}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center"
              title="Quét danh bạ bằng Trình duyệt (Playwright)"
            >
              {isScanningContacts ? '⏳ Đang quét...' : '🤖 Quét Danh bạ'}
            </button>
            <button
              onClick={handleScanViaApi}
              disabled={isScanningApi}
              className="px-4 py-2.5 bg-purple-100 text-purple-700 font-medium rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-all flex items-center"
              title="Quét bằng API: nhanh hơn, có UID thật"
            >
              {isScanningApi ? '⏳ Đang quét...' : '⚡ Quét bằng API'}
            </button>
            <button
              onClick={handleSendToMessaging}
              disabled={selectedContacts.size === 0}
              className="px-6 py-2.5 bg-brand text-white font-medium rounded-lg shadow-sm hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
            >
              <span className="mr-2">✉️</span> Chuyển sang Nhắn tin
            </button>
          </div>
          )}
        </div>
        )}

        {/* Table / Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {activeTab === 'add_by_phone' ? (
            <div className="p-6 max-w-3xl mx-auto space-y-6">
              <div className="bg-purple-50 text-purple-800 p-4 rounded-xl border border-purple-100 flex items-start">
                <span className="text-xl mr-3">⚡</span>
                <div>
                  <h3 className="font-bold text-sm">Gửi lời mời kết bạn tự động qua API (Nhanh siêu tốc)</h3>
                  <p className="text-sm mt-1 opacity-90">Hệ thống sẽ tự động quét số điện thoại ra tài khoản Zalo tương ứng và đẩy hàng chờ gửi lời mời kết bạn ngầm mà không cần hiện trình duyệt. Quá trình gửi sẽ được tự động giãn cách 5-15s để chống spam.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Danh sách số điện thoại</label>
                <textarea
                  className="w-full h-40 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm leading-relaxed"
                  placeholder="0912345678&#10;0987654321&#10;(Mỗi số điện thoại 1 dòng hoặc cách nhau bởi dấu phẩy)"
                  value={phoneNumbersInput}
                  onChange={e => setPhoneNumbersInput(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-2">Hỗ trợ các đầu số 09, 849, hoặc định dạng chuẩn Zalo.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lời nhắn kèm theo</label>
                <textarea
                  className="w-full h-24 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                  value={addPhoneMessage}
                  onChange={e => setAddPhoneMessage(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-2">Hỗ trợ biến: {'{name}'} (Tên đầy đủ Zalo), {'{first_name}'} (Tên gọi), {'{last_name}'} (Họ), {'{date}'} (Ngày).</p>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={handleSendFriendRequestByPhone}
                  disabled={isSendingPhoneReq || !selectedAccountId}
                  className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                >
                  {isSendingPhoneReq ? '⏳ Đang lên lịch gửi...' : '🚀 Bắt đầu gửi kết bạn'}
                </button>
              </div>
            </div>
          ) : isLoadingContacts ? (
            <div className="p-20 flex justify-center text-gray-400">Đang tải danh bạ...</div>
          ) : !selectedAccountId ? (
            <div className="p-20 text-center text-gray-500">Vui lòng chọn tài khoản ở cột bên trái</div>
          ) : (activeTab === 'friends' && contacts.length === 0) ? (
            <div className="p-20 text-center text-gray-500">
              Tài khoản này chưa quét được danh bạ nào.<br />
              Vui lòng qua tab "Tài khoản Zalo", bấm nút Quét để đồng bộ.
            </div>
          ) : (activeTab === 'blacklist' && blacklist.length === 0) ? (
            <div className="p-20 text-center text-gray-500">Chưa có ai trong danh sách chặn.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 text-sm sticky top-0 z-10">
                <tr>
                  {activeTab === 'friends' && (
                    <th className="p-3 w-12 text-center border-b border-gray-200">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                        checked={filteredContacts.length > 0 && filteredContacts.every(c => selectedContacts.has(c.id))}
                        onChange={handleSelectAll}
                      />
                    </th>
                  )}
                  <th className="p-3 border-b border-gray-200 w-16">Avatar</th>
                  <th className="p-3 border-b border-gray-200 font-semibold">Tên Zalo</th>
                  {activeTab === 'friends' && (
                    <th className="p-3 border-b border-gray-200 font-semibold">Phân loại</th>
                  )}
                  <th className="p-3 border-b border-gray-200 font-semibold w-24 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-800">
                {activeTab === 'friends' ? filteredContacts.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleToggleContact(user.id)}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedContacts.has(user.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                        checked={selectedContacts.has(user.id)}
                        readOnly
                      />
                    </td>
                    <td className="p-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gray-200 text-gray-600 overflow-hidden">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : (user.name || 'Z').charAt(0)}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{user.name}</span>
                      {user.id && !user.id.startsWith('zalo_id_') && (
                        <span className="ml-2 text-xs text-purple-500 font-mono" title={`UID: ${user.id}`}>⚡ UID</span>
                      )}
                    </td>
                    <td className="p-3">
                      {user.tags && user.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs whitespace-nowrap">
                          Chưa phân loại
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleAddToBlacklist(user)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        title="Chặn gửi tin"
                      >
                        🚫
                      </button>
                    </td>
                  </tr>
                )) : blacklist.map((user) => (
                  <tr key={user.contactId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gray-200 text-gray-600 overflow-hidden">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : (user.name || 'Z').charAt(0)}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-gray-600 line-through">{user.name}</span>
                      <span className="ml-2 text-xs text-gray-400 font-mono" title={`UID: ${user.contactId}`}>⚡ UID</span>
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleRemoveFromBlacklist(user.contactId)}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Khôi phục"
                      >
                        ♻️
                      </button>
                    </td>
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
