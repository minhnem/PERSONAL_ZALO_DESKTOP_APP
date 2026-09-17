import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  MdDelete, 
  MdVisibility, 
  MdRefresh,
  MdCheckCircle,
  MdError,
  MdPending,
  MdDownload
} from 'react-icons/md';
import * as XLSX from 'xlsx';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    
    // Auto refresh every 10 seconds to update progress
    const interval = setInterval(() => {
      if (!isModalOpen) fetchCampaigns(false); // Don't show loading on background refresh
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isModalOpen]);

  const fetchCampaigns = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/campaigns');
      if (res.data.success) {
        setCampaigns(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chiến dịch', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chiến dịch "${name}"? Thao tác này không thể hoàn tác.`)) return;
    
    try {
      const res = await axios.delete(`http://localhost:3001/api/campaigns/${id}`);
      if (res.data.success) {
        fetchCampaigns();
      }
    } catch (err) {
      alert('Lỗi khi xóa chiến dịch: ' + err.message);
    }
  };

  const openDetails = async (id) => {
    setIsModalOpen(true);
    setDetailsLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/campaigns/${id}`);
      if (res.data.success) {
        setSelectedCampaign(res.data.data);
      }
    } catch (err) {
      alert('Lỗi tải chi tiết: ' + err.message);
      setIsModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleExportExcel = () => {
    if (!selectedCampaign || !selectedCampaign.recipients) return;
    
    const excelData = selectedCampaign.recipients.map((r, index) => ({
      'STT': index + 1,
      'Zalo ID': r.contactId || '',
      'Tên người nhận': r.name || 'Không rõ tên',
      'Trạng thái': r.status === 'sent' ? 'Thành công' : r.status === 'failed' ? 'Lỗi' : 'Đang chờ',
      'Ghi chú (Lỗi)': r.errorMessage || ''
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ChiTietChienDich");
    
    const fileName = `BaoCao_${selectedCampaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const renderProgressBar = (stats) => {
    if (!stats || stats.total === 0) return null;
    const progressPercent = Math.round(((stats.sent + stats.failed) / stats.total) * 100);
    
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">{progressPercent}% Hoàn thành</span>
          <span className="font-medium text-gray-700">{stats.sent + stats.failed} / {stats.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 flex overflow-hidden">
          <div 
            className="bg-green-500 h-2 transition-all duration-500" 
            style={{ width: `${(stats.sent / stats.total) * 100}%` }}
          ></div>
          <div 
            className="bg-red-500 h-2 transition-all duration-500" 
            style={{ width: `${(stats.failed / stats.total) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[10px] mt-1 text-gray-400">
          <span className="text-green-600">{stats.sent} Thành công</span>
          <span className="text-red-500">{stats.failed} Lỗi</span>
          <span className="text-blue-500">{stats.pending} Đang chờ</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <span className="text-blue-600 mr-2">📊</span> Quản lý Chiến dịch
          </h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi tiến độ và báo cáo hiệu quả gửi tin tự động</p>
        </div>
        
        <button 
          onClick={() => fetchCampaigns()} 
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <MdRefresh className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={18} /> 
          Làm mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
              <tr className="border-b border-gray-200">
                <th className="py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Chiến dịch</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tài khoản</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">Tiến độ</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500">
                    Chưa có chiến dịch nào được tạo.
                  </td>
                </tr>
              ) : (
                campaigns.map(camp => (
                  <tr key={camp._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-800">{camp.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDate(camp.createdAt)}</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                      {camp.accountId}
                    </td>
                    <td className="py-4 px-6">
                      {renderProgressBar(camp.stats)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        camp.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                        camp.status === 'running' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {camp.status === 'completed' ? 'Hoàn thành' : camp.status === 'running' ? 'Đang chạy' : camp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openDetails(camp._id)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <MdVisibility size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(camp._id, camp.name)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Xóa chiến dịch"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chi tiết Chiến dịch */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                Chi tiết Chiến dịch: <span className="text-blue-600">{selectedCampaign?.name}</span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold px-2"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
              {detailsLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : selectedCampaign ? (
                <div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Mẫu tin nhắn:</h3>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 whitespace-pre-wrap border border-gray-100">
                      {selectedCampaign.messageTemplate}
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Danh sách Người nhận ({selectedCampaign.recipients.length})</h3>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="py-3 px-4 font-semibold text-gray-600 w-16 text-center">STT</th>
                          <th className="py-3 px-4 font-semibold text-gray-600">Tên / Zalo ID</th>
                          <th className="py-3 px-4 font-semibold text-gray-600">Trạng thái</th>
                          <th className="py-3 px-4 font-semibold text-gray-600">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedCampaign.recipients.map((r, index) => (
                          <tr key={r._id || index} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-center text-gray-400">{index + 1}</td>
                            <td className="py-3 px-4 font-medium text-gray-700">
                              <div>{r.name || 'Không rõ tên'}</div>
                              <div className="text-xs text-gray-400 font-normal">{r.contactId}</div>
                            </td>
                            <td className="py-3 px-4">
                              {r.status === 'sent' && (
                                <span className="flex items-center text-green-600 text-xs font-medium">
                                  <MdCheckCircle className="mr-1" size={16}/> Thành công
                                </span>
                              )}
                              {r.status === 'failed' && (
                                <span className="flex items-center text-red-500 text-xs font-medium">
                                  <MdError className="mr-1" size={16}/> Lỗi
                                </span>
                              )}
                              {r.status === 'pending' && (
                                <span className="flex items-center text-blue-500 text-xs font-medium">
                                  <MdPending className="mr-1 animate-pulse" size={16}/> Đang chờ
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-500">
                              {r.errorMessage || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">Không tải được dữ liệu chi tiết.</div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end space-x-3">
              <button 
                onClick={handleExportExcel}
                disabled={!selectedCampaign || detailsLoading}
                className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium rounded-lg transition-colors flex items-center disabled:opacity-50"
              >
                <MdDownload className="mr-2" size={18} />
                Xuất Excel
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
