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
import * as XLSX from 'xlsx';

export default function Messaging() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [limitPerAccount, setLimitPerAccount] = useState(30);
  
  const [activeAttachment, setActiveAttachment] = useState('text');
  const [campaignName, setCampaignName] = useState('Chiến dịch Mới');
  const [messageText, setMessageText] = useState('{Chúc|Mong|Thân chúc} sinh nhật {name}! Tuổi mới, chúc {first_name} luôn tràn ngập niềm vui. {Happy birthday|Sinh nhật vui vẻ}!');
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = React.useRef(null);
  const excelUploadRef = React.useRef(null);
  
  const [targetData, setTargetData] = useState({ source: null, contacts: [], lockedAccountId: null });
  const [isSending, setIsSending] = useState(false);
  const [sendMethod, setSendMethod] = useState('api'); // 'api' | 'playwright'
  
  const [isFriendRequest, setIsFriendRequest] = useState(false);
  const [friendRequestMessage, setFriendRequestMessage] = useState('');
  
  // State cho phần thêm số lạ thủ công
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  
  // State tracking chiến dịch
  const [activeCampaignIds, setActiveCampaignIds] = useState([]);
  const [activeCampaignsData, setActiveCampaignsData] = useState([]);

  useEffect(() => {
    if (activeCampaignIds.length === 0) return;
    
    const fetchCampaigns = async () => {
      try {
        const promises = activeCampaignIds.map(id => axios.get(`http://localhost:3001/api/campaigns/${id}`));
        const results = await Promise.all(promises);
        setActiveCampaignsData(results.map(res => res.data.data));
      } catch (err) {
        console.error('Lỗi tải thông tin chiến dịch:', err);
      }
    };
    
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 4000);
    return () => clearInterval(interval);
  }, [activeCampaignIds]);
  
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
          groupName: parsed.groupName, // Thêm groupName
          lockedAccountId: parsed.source === 'friends' ? parsed.accountId : null
        });
        
        // Auto-select account if provided
        if (parsed.accountId) {
          setSelectedAccountIds([parsed.accountId]);
        }
      } catch (e) {
        console.error('Lỗi đọc localStorage:', e);
      }
    }
  }, []);

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const newContacts = [];
        for (let i = 1; i < data.length; i++) {
          if (data[i][0]) {
            const id = data[i][0].toString().replace(/\s/g, '');
            if (!targetData.contacts.some(c => c.id === id) && !newContacts.some(c => c.id === id)) {
              newContacts.push({
                id,
                name: data[i][1] || data[i][0].toString(),
                type: 'excel'
              });
            }
          }
        }

        if (newContacts.length > 0) {
          setTargetData(prev => {
            const newData = {
              ...prev,
              source: prev.source || 'excel',
              contacts: [...newContacts, ...prev.contacts]
            };
            localStorage.setItem('messagingTarget', JSON.stringify(newData));
            return newData;
          });
          alert(`🎉 Đã tải lên thành công ${newContacts.length} người nhận từ file Excel!`);
        } else {
          alert('Không tìm thấy dữ liệu hợp lệ hoặc tất cả đã có trong danh sách.');
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi khi đọc file Excel! Đảm bảo định dạng chuẩn (Cột 1: SĐT/UID, Cột 2: Tên).');
      }
    };
    reader.readAsBinaryString(file);
    if (excelUploadRef.current) excelUploadRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['UID / Số điện thoại', 'Tên Khách Hàng (Tùy chọn)', 'Trạng thái (Tùy chọn)'],
      ['42894723947293847', 'Khách hàng 1', 'Chưa gửi'],
      ['0987654321', 'Khách hàng 2', 'Đã gửi']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Ba_Mau');
    XLSX.writeFile(wb, 'Zalo_DanhBa_Mau.xlsx');
  };

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
    if (selectedAccountIds.length === 0) return alert('Vui lòng chọn ít nhất 1 tài khoản gửi tin!');
    if (targetData.contacts.length === 0) return alert('Danh sách nhận tin đang trống!');
    if (!messageText.trim()) return alert('Vui lòng nhập nội dung tin nhắn!');
    if (isFriendRequest && !friendRequestMessage.trim()) return alert('Vui lòng nhập nội dung lời mời kết bạn!');
    if (isFriendRequest && friendRequestMessage.length > 150) return alert('Lời mời kết bạn không được vượt quá 150 ký tự!');

    const totalCapacity = selectedAccountIds.length * limitPerAccount;
    const toSendCount = Math.min(targetData.contacts.length, totalCapacity);
    
    let confirmMsg = `Bạn chuẩn bị tạo chiến dịch gửi cho ${toSendCount} người bằng ${selectedAccountIds.length} tài khoản.`;
    if (targetData.contacts.length > totalCapacity) {
      confirmMsg += `\n\nLưu ý: ${targetData.contacts.length - totalCapacity} người cuối danh sách sẽ bị bỏ lại vì vượt quá giới hạn (Giới hạn: ${limitPerAccount} tin/tài khoản).`;
    }
    
    const confirm = window.confirm(confirmMsg + '\n\nBạn có chắc chắn không?');
    if (!confirm) return;

    setIsSending(true);
    
    const formData = new FormData();
    formData.append('accountIds', JSON.stringify(selectedAccountIds));
    formData.append('limitPerAccount', limitPerAccount);
    formData.append('name', campaignName);
    formData.append('messageTemplate', messageText);
    formData.append('recipients', JSON.stringify(targetData.contacts));
    if (targetData.groupName) {
      formData.append('groupName', targetData.groupName);
    }
    
    if (isFriendRequest) {
      formData.append('isFriendRequest', 'true');
      formData.append('friendRequestMessage', friendRequestMessage);
    }
    
    if (activeAttachment === 'image' && imageFile) {
      formData.append('image', imageFile);
    }
    
    // Báo cho backend biết nếu đây là gửi vào Group
    formData.append('isGroupTarget', targetData.source === 'groups' ? 'true' : 'false');

    const endpoint = sendMethod === 'api' ? 'http://localhost:3001/api/campaigns-v2' : 'http://localhost:3001/api/campaigns';

    try {
      const res = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        alert('🎉 ' + res.data.message);
        setActiveCampaignIds(res.data.campaignIds || [res.data.campaignId]);
        
        // Update excelContacts status in local storage
        if (targetData.source === 'excel') {
           const excelContacts = JSON.parse(localStorage.getItem('excelContacts') || '[]');
           const sentIds = res.data.processedContactIds || targetData.contacts.slice(0, toSendCount).map(c => c.id);
           const updated = excelContacts.map(c => sentIds.includes(c.id) ? { ...c, status: 'sent' } : c);
           localStorage.setItem('excelContacts', JSON.stringify(updated));
        }
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

  const handleCancelCampaign = async (campaignId) => {
    if (!window.confirm('Bạn có chắc chắn muốn DỪNG chiến dịch này lại không? Những người chưa được gửi sẽ bị hủy bỏ.')) return;
    
    try {
      const res = await axios.post(`http://localhost:3001/api/campaigns/${campaignId}/cancel`);
      if (res.data.success) {
        alert('Đã lệnh dừng chiến dịch thành công!');
        // Update local state immediately
        setActiveCampaignsData(prev => 
          prev.map(c => c._id === campaignId ? { ...c, status: 'cancelled' } : c)
        );
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi dừng chiến dịch: ' + err.message);
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-gray-700 flex items-center">
            <span className="text-blue-500 mr-2">👤</span> Chọn Tài khoản Gửi (Có thể chọn nhiều):
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Giới hạn tin / tài khoản:</span>
            <input 
              type="number" 
              value={limitPerAccount}
              onChange={e => setLimitPerAccount(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-brand text-center"
              min="1"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {accounts.map(acc => (
            <label key={acc.phoneNumber} className={`flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${selectedAccountIds.includes(acc.phoneNumber) ? 'border-brand bg-brand/5' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input 
                type="checkbox"
                className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
                checked={selectedAccountIds.includes(acc.phoneNumber)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedAccountIds([...selectedAccountIds, acc.phoneNumber]);
                  else setSelectedAccountIds(selectedAccountIds.filter(id => id !== acc.phoneNumber));
                }}
                disabled={!!targetData.lockedAccountId && targetData.lockedAccountId !== acc.phoneNumber}
              />
              <span className="text-sm font-medium text-gray-700">{acc.name || acc.phoneNumber}</span>
              <span className={`text-xs ${acc.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                {acc.status === 'active' ? '(Sẵn sàng)' : '(Mất kết nối)'}
              </span>
            </label>
          ))}
        </div>
        {targetData.lockedAccountId && (
          <span className="text-xs text-orange-500 italic">*Chỉ được chọn 1 tài khoản vì bạn đang gửi cho Bạn bè nội bộ của tài khoản này.</span>
        )}
        
        {accounts.length === 0 && (
          <span className="text-red-500 text-sm italic">Bạn chưa có tài khoản nào. Vui lòng qua tab Quản lý Tài khoản để thêm.</span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* 🟢 LEFT COLUMN: COMPOSE MESSAGE */}
        <div className="w-full lg:w-7/12 flex flex-col gap-5 h-full overflow-y-auto pr-2 custom-scrollbar pb-32">
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col min-h-[400px]">
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
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors resize-none flex-1 min-h-[200px]"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <div className="text-right text-xs text-gray-400 mt-1 mb-3">
              {messageText.length} ký tự
            </div>

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

            {/* Friend Request Feature */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 shrink-0 transition-all">
              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                <input 
                  type="checkbox" 
                  checked={isFriendRequest}
                  onChange={(e) => setIsFriendRequest(e.target.checked)}
                  className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
                />
                <span className="text-sm font-semibold text-blue-800">🤝 Gửi kèm yêu cầu kết bạn (API Zalo)</span>
              </label>
              
              {isFriendRequest && (
                <div className="mt-3 pl-6">
                  {(activeAttachment === 'image' || activeAttachment === 'video') && (
                    <div className="mb-2 text-xs text-orange-600 flex items-start bg-orange-50 p-2 rounded border border-orange-200">
                      <MdError className="mr-1 mt-0.5 shrink-0" size={14} />
                      Tính năng kết bạn chỉ hỗ trợ gửi văn bản. Ảnh/Video sẽ được đính kèm vào tin nhắn inbox thường.
                    </div>
                  )}
                  <textarea
                    placeholder="Nhập lời chào kết bạn (Tối đa 150 ký tự). Ví dụ: Chào bạn, mình biết bạn qua..."
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors resize-none"
                    rows="2"
                    value={friendRequestMessage}
                    onChange={(e) => setFriendRequestMessage(e.target.value.substring(0, 150))}
                  />
                  <div className="text-right text-xs text-blue-500 mt-1">
                    {friendRequestMessage.length}/150
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end items-center shrink-0 mt-2">
              <div className="flex space-x-3 items-center">
                <button 
                  onClick={() => alert('Đã lưu nội dung nháp!')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center"
                >
                  <IoCheckmarkCircle className="mr-2" size={18} /> Lưu mẫu
                </button>
                
                {/* Toggle Send Method */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white text-sm h-full">
                  <button
                    onClick={() => setSendMethod('api')}
                    className={`px-3 py-2 font-medium transition-colors ${sendMethod === 'api' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    title="Gửi siêu tốc bằng API (chỉ dùng UID)"
                  >
                    ⚡ API
                  </button>
                  <button
                    onClick={() => setSendMethod('playwright')}
                    className={`px-3 py-2 font-medium transition-colors border-l border-gray-300 ${sendMethod === 'playwright' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    title="Gửi chậm như người thật (dùng trình duyệt)"
                  >
                    🤖 Auto Web
                  </button>
                </div>

                <button 
                  onClick={handleSendCampaign}
                  disabled={isSending || accounts.length === 0 || targetData.contacts.length === 0 || activeCampaignIds.length > 0}
                  className="px-6 py-2 bg-brand border border-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors flex items-center shadow-sm disabled:opacity-50 h-full"
                >
                  {isSending ? 'Đang tạo...' : activeCampaignIds.length > 0 ? 'Đang theo dõi...' : 'Bắt đầu Chiến dịch'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 RIGHT COLUMN: RECIPIENTS TARGET OR TRACKING */}
        <div className="w-full lg:w-5/12 flex flex-col gap-5 h-full">
          {activeCampaignIds.length > 0 ? (
            <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-5 flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center text-lg">
                    <span className="text-blue-500 mr-2">📡</span>
                    Tiến độ {activeCampaignIds.length} Chiến dịch
                  </h3>
                  <div className="text-xs text-gray-500 mt-1">Đang theo dõi trực tiếp quá trình gửi</div>
                </div>
                <button 
                  onClick={() => {
                    setActiveCampaignIds([]);
                    setActiveCampaignsData([]);
                    setTargetData({ source: null, contacts: [], lockedAccountId: null });
                    localStorage.removeItem('messagingTarget');
                    
                    // Reset luôn form gửi tin
                    setImageFile(null);
                    setCampaignName('Chiến dịch Mới');
                    setActiveAttachment('text');
                  }}
                  className="px-3 py-1.5 border border-brand bg-brand/5 text-brand rounded-lg text-sm font-medium hover:bg-brand/10 transition-colors shrink-0 whitespace-nowrap"
                >
                  + Tạo mới
                </button>
              </div>

              {activeCampaignsData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                  {activeCampaignsData.map((campaignData) => (
                    <div key={campaignData._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="font-bold text-gray-800 text-sm mb-2 truncate" title={campaignData.name}>{campaignData.name}</div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-600 flex items-center space-x-2">
                          <span className={`font-semibold ${campaignData.status === 'completed' ? 'text-green-600' : campaignData.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'}`}>
                            {campaignData.status === 'completed' ? 'Hoàn tất' : campaignData.status === 'cancelled' ? 'Đã hủy' : 'Đang chạy'}
                          </span>
                          {campaignData.status === 'running' && (
                            <button 
                              onClick={() => handleCancelCampaign(campaignData._id)}
                              className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] hover:bg-red-100 transition-colors font-semibold"
                            >
                              🟥 Dừng
                            </button>
                          )}
                        </span>
                        <span className="font-semibold text-gray-800">
                          {campaignData.stats?.sent + campaignData.stats?.failed || 0} / {campaignData.stats?.total || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 flex overflow-hidden mb-2">
                        <div className="bg-green-500 h-2 transition-all duration-500" style={{ width: `${((campaignData.stats?.sent || 0) / (campaignData.stats?.total || 1)) * 100}%` }}></div>
                        <div className="bg-red-500 h-2 transition-all duration-500" style={{ width: `${((campaignData.stats?.failed || 0) / (campaignData.stats?.total || 1)) * 100}%` }}></div>
                      </div>
                      <div className="flex justify-between text-xs">
                         <span className="text-green-600 font-medium">TC: {campaignData.stats?.sent || 0}</span>
                         <span className="text-red-500 font-medium">Lỗi: {campaignData.stats?.failed || 0}</span>
                         <span className="text-blue-500 font-medium">Chờ: {campaignData.stats?.pending || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
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

            {/* Thêm người nhận thủ công / Excel */}
            <div className="mb-4 shrink-0 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-700">Thêm người nhận (SĐT/UID):</label>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleDownloadTemplate} 
                    className="text-xs text-gray-600 font-medium hover:underline flex items-center bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                    title="Tải file Excel mẫu"
                  >
                    Tải mẫu
                  </button>
                  <button 
                    onClick={() => excelUploadRef.current?.click()} 
                    className="text-xs text-brand font-medium hover:underline flex items-center bg-brand/5 hover:bg-brand/10 px-2 py-1 rounded transition-colors"
                  >
                    <IoDocumentTextOutline className="mr-1" /> Nhập Excel
                  </button>
                  <input
                    type="file"
                    ref={excelUploadRef}
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="UID hoặc SĐT"
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
                  Vui lòng qua tab <span className="font-semibold">Bạn bè Zalo</span> hoặc <span className="font-semibold">Quản lý dữ liệu Excel</span> để chọn đối tượng trước!
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
