import React, { useState, useEffect } from 'react';
import { 
  IoImageOutline, 
  IoDocumentTextOutline, 
  IoVideocamOutline,
  IoCheckmarkCircle,
  IoTrashOutline
} from 'react-icons/io5';
import { MdAutoAwesome, MdPending, MdCheckCircle, MdError } from 'react-icons/md';
import axios from 'axios';

export default function Messaging() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  const [activeAttachment, setActiveAttachment] = useState('text');
  const [campaignName, setCampaignName] = useState('Chiến dịch Mới');
  const [messageText, setMessageText] = useState('{Chúc|Mong|Thân chúc} sinh nhật {name}! Tuổi mới, chúc {first_name} luôn tràn ngập niềm vui. {Happy birthday|Sinh nhật vui vẻ}!');
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = React.useRef(null);
  
  const [targetData, setTargetData] = useState({ source: null, contacts: [], lockedAccountId: null });
  const [isSending, setIsSending] = useState(false);
  
  // State cho phần thêm số lạ thủ công
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  
  // State tracking chiến dịch
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeCampaignData, setActiveCampaignData] = useState(null);

  useEffect(() => {
    if (!activeCampaignId) return;
    
    const fetchCampaign = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/campaigns/${activeCampaignId}`);
        if (res.data.success) {
          setActiveCampaignData(res.data.data);
        }
      } catch (err) {
        console.error('Lỗi tải thông tin chiến dịch:', err);
      }
    };
    
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 4000);
    return () => clearInterval(interval);
  }, [activeCampaignId]);
  
  // 1. Fetch Accounts on Mount
  useEffect(() => {
    axios.get('http://localhost:3001/api/accounts')
      .then(res => {
        if (res.data.success) {
          setAccounts(res.data.data);
        }
      })
      .catch(err => console.error('Lỗi tải danh sách tài khoản:', err));
  }, []);

  // 2. Load Target Data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('messagingTarget');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setTargetData({
          source: parsed.source,
          contacts: parsed.contacts || [],
          lockedAccountId: parsed.source === 'friends' ? parsed.accountId : null
        });
        
        // Auto-select account if provided
        if (parsed.accountId) {
          setSelectedAccountId(parsed.accountId);
        }
      } catch (e) {
        console.error('Lỗi đọc localStorage:', e);
      }
    }
  }, []);

  const handleRemoveContact = (idToRemove) => {
    setTargetData(prev => {
      const newData = {
        ...prev,
        contacts: prev.contacts.filter(c => c.id !== idToRemove)
      };
      // Lưu ngay vào localStorage để không bị mất khi reload
      localStorage.setItem('messagingTarget', JSON.stringify(newData));
      return newData;
    });
  };

  const handleAddStranger = () => {
    if (!manualPhone.trim()) return alert('Vui lòng nhập số điện thoại');
    const id = manualPhone.trim().replace(/\s/g, '');
    
    // Kiểm tra trùng lặp
    if (targetData.contacts.some(c => c.id === id)) {
      return alert('Số điện thoại này đã có trong danh sách chờ gửi!');
    }

    const newContact = { id, name: manualName.trim() || id, type: 'stranger' };
    
    setTargetData(prev => {
      const newData = {
        ...prev,
        source: prev.source || 'manual', // Cập nhật source nếu đang rỗng
        contacts: [newContact, ...prev.contacts]
      };
      // Lưu ngay vào localStorage
      localStorage.setItem('messagingTarget', JSON.stringify(newData));
      return newData;
    });
    
    setManualPhone('');
    setManualName('');
  };

  const handleClearList = () => {
    if(window.confirm('Bạn có chắc muốn xóa toàn bộ danh sách chờ gửi?')) {
      setTargetData({ source: null, contacts: [], lockedAccountId: null });
      localStorage.removeItem('messagingTarget');
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản gửi tin!');
    if (targetData.contacts.length === 0) return alert('Danh sách nhận tin đang trống!');
    if (!messageText.trim()) return alert('Vui lòng nhập nội dung tin nhắn!');

    const confirm = window.confirm(`Bạn chuẩn bị tạo chiến dịch gửi cho ${targetData.contacts.length} người. Bạn có chắc chắn không?`);
    if (!confirm) return;

    setIsSending(true);
    
    const formData = new FormData();
    formData.append('accountId', selectedAccountId);
    formData.append('name', campaignName);
    formData.append('messageTemplate', messageText);
    formData.append('recipients', JSON.stringify(targetData.contacts));
    
    if (activeAttachment === 'image' && imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const res = await axios.post('http://localhost:3001/api/campaigns', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        alert('🎉 ' + res.data.message);
        // Đã gỡ bỏ setImageFile(null) để giữ nguyên ảnh trên giao diện Tracking
        setActiveCampaignId(res.data.campaignId); // Chuyển sang Tracking Mode
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo chiến dịch: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleInsertShortcode = (code) => {
    const textarea = document.getElementById('message-textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = messageText;
      const newText = text.substring(0, start) + code + text.substring(end);
      setMessageText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + code.length, start + code.length);
      }, 0);
    } else {
      setMessageText(prev => prev + code);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 relative pb-8 p-6">
      
      {/* 🟢 TOP BAR: ACCOUNT SELECTOR */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="font-semibold text-gray-700 flex items-center">
            <span className="text-blue-500 mr-2">👤</span> Chọn Tài khoản Gửi:
          </label>
          <select 
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            disabled={!!targetData.lockedAccountId}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand min-w-[250px] bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="" disabled>-- Vui lòng chọn tài khoản --</option>
            {accounts.map(acc => (
              <option key={acc.phoneNumber} value={acc.phoneNumber}>
                {acc.name || acc.phoneNumber} {acc.status === 'active' ? '(Đang kết nối)' : '(Mất kết nối)'}
              </option>
            ))}
          </select>
          {targetData.lockedAccountId && (
            <span className="text-xs text-orange-500 italic">*Tài khoản bị khóa vì bạn đang gửi cho Bạn bè của tài khoản này.</span>
          )}
        </div>
        
        {accounts.length === 0 && (
          <span className="text-red-500 text-sm italic">Bạn chưa có tài khoản nào. Vui lòng qua tab Quản lý Tài khoản để thêm.</span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 h-[calc(100%-80px)]">
        {/* 🟢 LEFT COLUMN: COMPOSE MESSAGE */}
        <div className="w-full lg:w-7/12 flex flex-col gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
          {/* Batch Name */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 shrink-0">
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <span className="text-brand mr-2">🎯</span> Tên Chiến dịch
            </label>
            <input 
              type="text" 
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ví dụ: Chăm sóc khách hàng VIP tháng 10"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            />
          </div>

          {/* Attachment Type */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 shrink-0">
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
              <span className="text-gray-400 mr-2">📎</span> Loại đính kèm
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => setActiveAttachment('text')}
                className={`flex flex-col items-center justify-center py-4 border rounded-lg transition-all ${
                  activeAttachment === 'text' 
                  ? 'border-brand bg-brand/5 text-brand shadow-sm' 
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <IoDocumentTextOutline size={24} className="mb-2" />
                <span className="text-sm font-medium">Văn bản</span>
              </button>
              
              <button 
                onClick={() => {
                  setActiveAttachment('image');
                  fileInputRef.current?.click();
                }}
                className={`flex flex-col items-center justify-center py-4 border rounded-lg transition-all ${
                  activeAttachment === 'image' 
                  ? 'border-brand bg-brand/5 text-brand shadow-sm' 
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <IoImageOutline size={24} className="mb-2 text-orange-500" />
                <span className="text-sm font-medium">Hình ảnh</span>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }} 
              />
              
              <button 
                onClick={() => setActiveAttachment('video')}
                className={`flex flex-col items-center justify-center py-4 border rounded-lg transition-all ${
                  activeAttachment === 'video' 
                  ? 'border-brand bg-brand/5 text-brand shadow-sm' 
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <IoVideocamOutline size={24} className="mb-2 text-purple-500" />
                <span className="text-sm font-medium">Video</span>
              </button>
            </div>
            
            {imageFile && activeAttachment === 'image' && (
              <div className="mt-3 text-sm text-green-700 flex items-center justify-between bg-green-50 p-2.5 rounded-lg border border-green-200">
                <div className="flex items-center truncate">
                  <IoCheckmarkCircle className="mr-2 shrink-0" size={18} /> 
                  <span className="truncate">Đã chọn ảnh: <strong>{imageFile.name}</strong></span>
                </div>
                <button 
                  onClick={() => setImageFile(null)} 
                  className="text-red-500 hover:text-red-700 ml-3 p-1.5 hover:bg-red-100 rounded-md transition-colors shrink-0 flex items-center justify-center"
                  title="Xóa ảnh này"
                >
                  ✖
                </button>
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex-1 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <span className="text-orange-500 mr-2">✍️</span> Nội dung tin nhắn
              </label>
              <div className="flex items-center space-x-4 text-sm">
                <button className="text-purple-600 hover:text-purple-700 font-medium flex items-center">
                  <MdAutoAwesome className="mr-1" /> AI Magic
                </button>
              </div>
            </div>

            <textarea 
              id="message-textarea"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors resize-none flex-1 mb-4"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />

            {/* Shortcodes */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4 shrink-0">
              <div className="text-xs text-gray-500 mb-2 flex items-center">
                <span className="text-yellow-500 mr-1">💡</span> Shortcodes - Bấm để chèn:
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {['{name}', '{first_name}', '{last_name}', '{date}', '{datetime}', '{year}', '{random}', '{option1|option2}'].map(code => (
                  <button 
                    key={code} 
                    onClick={() => handleInsertShortcode(code)}
                    className="px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded text-xs hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-400">{messageText.length} ký tự</span>
              <div className="flex space-x-3">
                <button 
                  onClick={() => alert('Đã lưu nội dung nháp!')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center"
                >
                  <IoCheckmarkCircle className="mr-2" size={18} /> Lưu mẫu
                </button>
                <button 
                  onClick={handleSendCampaign}
                  disabled={isSending || accounts.length === 0 || targetData.contacts.length === 0 || !!activeCampaignId}
                  className="px-6 py-2 bg-brand border border-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors flex items-center shadow-sm disabled:opacity-50"
                >
                  {isSending ? 'Đang tạo...' : activeCampaignId ? 'Đang theo dõi tiến độ...' : 'Bắt đầu Chiến dịch'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 RIGHT COLUMN: RECIPIENTS TARGET OR TRACKING */}
        <div className="w-full lg:w-5/12 flex flex-col gap-5 h-full">
          {activeCampaignId ? (
            <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-5 flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center text-lg">
                    <span className="text-blue-500 mr-2">📡</span>
                    Tiến độ Chiến dịch
                  </h3>
                  <div className="text-xs text-gray-500 mt-1">Đang theo dõi trực tiếp quá trình gửi</div>
                </div>
                <button 
                  onClick={() => {
                    setActiveCampaignId(null);
                    setActiveCampaignData(null);
                    setTargetData({ source: null, contacts: [], lockedAccountId: null });
                    localStorage.removeItem('messagingTarget');
                    
                    // Reset luôn form gửi tin
                    setImageFile(null);
                    setCampaignName('Chiến dịch Mới');
                    setActiveAttachment('text');
                  }}
                  className="px-3 py-1.5 border border-brand bg-brand/5 text-brand rounded-lg text-sm font-medium hover:bg-brand/10 transition-colors"
                >
                  + Tạo chiến dịch mới
                </button>
              </div>

              {!activeCampaignData ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <div className="mb-4 bg-gray-50 p-4 rounded-lg shrink-0">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Trạng thái: 
                        <span className="font-semibold ml-1 text-blue-600">{activeCampaignData.status === 'completed' ? 'Hoàn tất' : 'Đang chạy'}</span>
                      </span>
                      <span className="font-semibold text-gray-800">
                        {activeCampaignData.stats?.sent + activeCampaignData.stats?.failed || 0} / {activeCampaignData.stats?.total || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                      <div className="bg-green-500 h-2.5 transition-all duration-500" style={{ width: `${((activeCampaignData.stats?.sent || 0) / (activeCampaignData.stats?.total || 1)) * 100}%` }}></div>
                      <div className="bg-red-500 h-2.5 transition-all duration-500" style={{ width: `${((activeCampaignData.stats?.failed || 0) / (activeCampaignData.stats?.total || 1)) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                       <span className="text-green-600 font-medium">Thành công: {activeCampaignData.stats?.sent || 0}</span>
                       <span className="text-red-500 font-medium">Lỗi: {activeCampaignData.stats?.failed || 0}</span>
                       <span className="text-blue-500 font-medium">Đang chờ: {activeCampaignData.stats?.pending || 0}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-2 custom-scrollbar">
                    {activeCampaignData.recipients.map((r, i) => (
                      <div key={r.contactId + i} className="flex flex-col p-3 rounded-lg border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800 truncate">{r.contactId}</p>
                          <div className="shrink-0 ml-3">
                             {r.status === 'sent' && <span className="flex items-center text-green-600 text-xs font-medium"><MdCheckCircle className="mr-1" size={16}/> Thành công</span>}
                             {r.status === 'failed' && <span className="flex items-center text-red-500 text-xs font-medium"><MdError className="mr-1" size={16}/> Lỗi</span>}
                             {r.status === 'pending' && <span className="flex items-center text-blue-500 text-xs font-medium"><MdPending className="mr-1 animate-pulse" size={16}/> Đang chờ</span>}
                          </div>
                        </div>
                        {r.errorMessage && <p className="text-xs text-red-500 mt-1">{r.errorMessage}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-semibold text-gray-800 flex items-center text-lg">
                  <span className="text-green-500 mr-2">🎯</span>
                  Danh sách chờ gửi
                </h3>
                <div className="text-xs text-gray-500 flex items-center mt-1">
                  Đã chốt {targetData.contacts.length} người nhận 
                  {targetData.source === 'excel' ? ' (Từ Excel)' : targetData.source === 'friends' ? ' (Từ Bạn bè)' : ''}
                </div>
              </div>
              {targetData.contacts.length > 0 && (
                <button 
                  onClick={handleClearList}
                  className="px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center"
                >
                  Xóa toàn bộ
                </button>
              )}
            </div>

            {/* Thêm số lạ thủ công */}
            <div className="mb-4 shrink-0 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Thêm số điện thoại lạ nhanh:</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Số điện thoại"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
                />
                <input
                  type="text"
                  placeholder="Tên (Tùy chọn)"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
                />
                <button
                  onClick={handleAddStranger}
                  className="px-3 py-1.5 bg-brand text-white text-sm font-medium rounded hover:bg-brand/90 transition-colors shrink-0"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1 custom-scrollbar">
              {targetData.contacts.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500 flex flex-col items-center">
                  <span className="text-4xl mb-4 text-gray-300">🤷‍♂️</span>
                  Chưa có danh sách nhận tin.<br/><br/>
                  Vui lòng qua tab <span className="font-semibold">Bạn bè Zalo</span> hoặc <span className="font-semibold">Số lạ từ Excel</span> để chọn đối tượng trước!
                </div>
              ) : (
                targetData.contacts.map((user, i) => (
                  <div key={user.id + i} className="flex items-center p-3 rounded-lg border border-gray-100 bg-gray-50 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 bg-brand text-white overflow-hidden shrink-0">
                      {targetData.source === 'excel' ? '👤' : user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                       <p className="text-xs text-gray-500 truncate">{user.id}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveContact(user.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Xóa khỏi danh sách"
                    >
                      <IoTrashOutline size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
