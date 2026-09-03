import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

export default function ExcelContacts() {
  const [importedContacts, setImportedContacts] = useState(() => {
    const saved = localStorage.getItem('excelContacts');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');

  useEffect(() => {
    localStorage.setItem('excelContacts', JSON.stringify(importedContacts));
  }, [importedContacts]);
  const excelInputRef = useRef(null);
  const navigate = useNavigate();

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
        // Dòng 1 là Tiêu đề. Cột 1 (index 0) là SĐT, Cột 2 (index 1) là Tên
        for (let i = 1; i < data.length; i++) {
          if (data[i][0]) {
            const id = data[i][0].toString().replace(/\s/g, '');
            // Chỉ thêm nếu chưa có trong danh sách
            if (!importedContacts.some(c => c.id === id) && !newContacts.some(c => c.id === id)) {
              newContacts.push({
                id,
                name: data[i][1] || data[i][0].toString(),
                type: 'stranger'
              });
            }
          }
        }

        if (newContacts.length > 0) {
          const merged = [...newContacts, ...importedContacts];
          setImportedContacts(merged);

          const newSelected = new Set(selectedContacts);
          newContacts.forEach(c => newSelected.add(c.id));
          setSelectedContacts(newSelected);

          alert(`🎉 Đã thêm thành công ${newContacts.length} số điện thoại mới!`);
        } else {
          alert('Không tìm thấy số mới nào hoặc tất cả các số đã có trong danh sách.');
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi khi đọc file Excel! Đảm bảo định dạng cột chuẩn.');
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Số điện thoại', 'Tên Khách Hàng (Tùy chọn)'],
      ['0901234567', 'Khách hàng 1'],
      ['0987654321', 'Khách hàng 2']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Ba_Mau');
    XLSX.writeFile(wb, 'Zalo_DanhBa_Mau.xlsx');
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === importedContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(importedContacts.map(c => c.id)));
    }
  };

  const handleToggleContact = (id) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContacts(newSet);
  };

  const handleAddManual = () => {
    if (!manualPhone.trim()) return alert('Vui lòng nhập số điện thoại');
    const id = manualPhone.trim().replace(/\s/g, '');
    const newContact = {
      id,
      name: manualName.trim() || id,
      type: 'stranger'
    };

    if (importedContacts.some(c => c.id === id)) {
      return alert('Số điện thoại này đã có trong danh sách!');
    }

    const newList = [newContact, ...importedContacts];
    setImportedContacts(newList);
    setSelectedContacts(new Set([...selectedContacts, id]));
    setManualPhone('');
    setManualName('');
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách này không?')) {
      setImportedContacts([]);
      setSelectedContacts(new Set());
    }
  };

  const handleDeleteContact = (id, e) => {
    e.stopPropagation();
    const newList = importedContacts.filter(c => c.id !== id);
    setImportedContacts(newList);
    const newSelected = new Set(selectedContacts);
    newSelected.delete(id);
    setSelectedContacts(newSelected);
  };

  const handleSendToMessaging = () => {
    if (selectedContacts.size === 0) return alert('Vui lòng chọn ít nhất 1 người!');

    const selectedList = importedContacts.filter(c => selectedContacts.has(c.id));

    // Lưu vào localStorage. Với số lạ, tài khoản sẽ được chọn ở màn hình Nhắn tin.
    const dataToPass = {
      accountId: '', // Chưa chọn tài khoản
      source: 'excel',
      contacts: selectedList.map(c => ({ id: c.id, name: c.name }))
    };

    localStorage.setItem('messagingTarget', JSON.stringify(dataToPass));
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 relative pb-8 p-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
        {/* Header & Actions */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="font-bold text-gray-800 text-lg flex items-center">
              <span className="text-orange-500 mr-2">📊</span> Danh sách Số lạ từ Excel
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {importedContacts.length} liên hệ | Đã chọn: <span className="font-bold text-orange-600">{selectedContacts.size}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 items-end">
            {/* Hàng 1: Thêm thủ công */}
            <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200">
              <input
                type="text"
                placeholder="Số điện thoại"
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                className="w-32 px-3 py-1.5 text-sm border-none outline-none focus:ring-0"
              />
              <div className="w-px h-5 bg-gray-200"></div>
              <input
                type="text"
                placeholder="Tên (Tùy chọn)"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                className="w-32 px-3 py-1.5 text-sm border-none outline-none focus:ring-0"
              />
              <button
                onClick={handleAddManual}
                className="px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 transition-colors"
              >
                Thêm
              </button>
            </div>

            {/* Hàng 2: Import & Hành động chung */}
            <div className="flex space-x-3 items-center">
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Xóa tất cả
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Tải file mẫu
              </button>
              <button
                onClick={() => excelInputRef.current?.click()}
                className="px-4 py-2 bg-green-50 text-green-700 border border-green-300 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center transition-colors"
              >
                <span className="mr-2">📥</span> Nhập File Excel
              </button>
              <input
                type="file"
                ref={excelInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
              />
              <div className="w-px h-8 bg-gray-300 mx-2"></div>
              <button
                onClick={handleSendToMessaging}
                disabled={selectedContacts.size === 0}
                className="px-6 py-2.5 bg-brand text-white font-medium rounded-lg shadow-sm hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
              >
                <span className="mr-2">✉️</span> Chuyển sang Nhắn tin
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {importedContacts.length === 0 ? (
            <div className="p-20 text-center text-gray-500">
              <span className="text-4xl mb-4 block">📄</span>
              Chưa có dữ liệu. Vui lòng bấm "Nhập File Excel" để tải danh sách lên.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 text-sm sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 text-center border-b border-gray-200">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      checked={importedContacts.length > 0 && selectedContacts.size === importedContacts.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 border-b border-gray-200 w-16">Avatar</th>
                  <th className="p-3 border-b border-gray-200 font-semibold">Tên Khách Hàng</th>
                  <th className="p-3 border-b border-gray-200 font-semibold">Số điện thoại</th>
                  <th className="p-3 border-b border-gray-200 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-800">
                {importedContacts.map((user, i) => (
                  <tr
                    key={user.id + i}
                    onClick={() => handleToggleContact(user.id)}
                    className={`border-b border-gray-100 hover:bg-orange-50/50 cursor-pointer transition-colors ${selectedContacts.has(user.id) ? 'bg-orange-50' : ''}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        checked={selectedContacts.has(user.id)}
                        readOnly
                      />
                    </td>
                    <td className="p-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-orange-100 text-orange-600 overflow-hidden">
                        👤
                      </div>
                    </td>
                    <td className="p-3 font-medium">{user.name}</td>
                    <td className="p-3 text-orange-600 font-semibold">{user.id}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => handleDeleteContact(user.id, e)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        title="Xóa"
                      >
                        🗑️
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
