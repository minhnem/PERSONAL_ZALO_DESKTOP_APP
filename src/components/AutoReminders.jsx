import React, { useState, useEffect } from 'react';
import { MdAdd, MdClose, MdDeleteOutline, MdEdit } from 'react-icons/md';
import axios from 'axios';
import { Switch, DatePicker, TimePicker, ConfigProvider, message, Spin, Empty, Popconfirm, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

export default function AutoReminders() {
  const [activeTab, setActiveTab] = useState('create'); // 'data', 'create', 'manage'
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // API State
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Schedule Settings State
  const [scheduleConfig, setScheduleConfig] = useState({
    isAutoRun: true,
    runTime: dayjs('09:00', 'HH:mm'),
    startDate: null,
    hasEndDate: false,
    endDate: null,
    allowedAccountIds: []
  });

  // Accounts Data
  const [accounts, setAccounts] = useState([]);

  // Form State for Add/Edit Customer
  const [customerForm, setCustomerForm] = useState({ id: null, name: '', phone: '', status: 'active' });
  const [productsBought, setProductsBought] = useState([{ id: 1, name: '', date: null, quantity: 1 }]);

  // Form State for Create Campaign (Rules)
  const [productRules, setProductRules] = useState([{ id: 1, productName: '', cycleDays: '', remindBeforeDays: 3, messageContent: '', attachedImage: '' }]);

  // Logs Data
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchRules();
    fetchScheduleConfig();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchLogs();
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await axios.get('http://localhost:3001/api/reminder-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/accounts');
      if (res.data.success) {
        setAccounts(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tài khoản:', err);
    }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/customers');
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/reminder-rules');
      if (res.data.success && res.data.data.length > 0) {
        const mappedRules = res.data.data.map(r => ({
          id: r._id,
          productName: r.productName,
          cycleDays: r.cycleDays || '',
          remindBeforeDays: r.remindBeforeDays || 3,
          messageContent: r.messageContent || '',
          attachedImage: r.attachedImage || ''
        }));
        setProductRules(mappedRules);
        setIsEditMode(false); // Default to view mode if data exists
      } else {
        setIsEditMode(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchScheduleConfig = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/settings/auto-reminder');
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setScheduleConfig({
          isAutoRun: d.isAutoRun,
          runTime: d.runTime ? dayjs(d.runTime, 'HH:mm') : dayjs('09:00', 'HH:mm'),
          startDate: d.startDate ? dayjs(d.startDate) : null,
          hasEndDate: d.hasEndDate,
          endDate: d.endDate ? dayjs(d.endDate) : null,
          allowedAccountIds: d.allowedAccountIds || []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      return message.error('Vui lòng nhập Tên và Số điện thoại!');
    }

    const trackedProducts = productsBought
      .filter(p => p.name && p.date)
      .map(p => ({
        productName: p.name,
        purchaseDate: p.date.format('YYYY-MM-DD'),
        quantity: p.quantity
      }));

    try {
      if (customerForm.id) {
        await axios.put(`http://localhost:3001/api/customers/${customerForm.id}`, {
          name: customerForm.name,
          phone: customerForm.phone,
          status: customerForm.status,
          trackedProducts
        });
        message.success('Cập nhật khách hàng thành công!');
      } else {
        await axios.post('http://localhost:3001/api/customers', {
          name: customerForm.name,
          phone: customerForm.phone,
          status: customerForm.status,
          trackedProducts
        });
        message.success('Thêm khách hàng thành công!');
      }

      setShowAddCustomerModal(false);
      setCustomerForm({ id: null, name: '', phone: '', status: 'active' });
      setProductsBought([{ id: 1, name: '', date: null, quantity: 1 }]);
      fetchCustomers();
    } catch (err) {
      message.error('Lỗi lưu khách hàng: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/customers/${id}`);
      message.success('Đã xóa khách hàng');
      fetchCustomers();
    } catch (err) {
      message.error('Lỗi xóa khách hàng: ' + err.message);
    }
  };

  const handleEditCustomerClick = (customer) => {
    setCustomerForm({
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      status: customer.status || 'active'
    });
    
    if (customer.trackedProducts && customer.trackedProducts.length > 0) {
      setProductsBought(customer.trackedProducts.map(p => ({
        id: p._id || Date.now() + Math.random(),
        name: p.productName,
        date: p.purchaseDate ? dayjs(p.purchaseDate) : null,
        quantity: p.quantity || 1
      })));
    } else {
      setProductsBought([{ id: 1, name: '', date: null, quantity: 1 }]);
    }
    
    setShowAddCustomerModal(true);
  };

  const handleSaveCampaign = async () => {
    try {
      // 1. Save Schedule
      const payloadSchedule = {
        isAutoRun: scheduleConfig.isAutoRun,
        runTime: scheduleConfig.runTime ? scheduleConfig.runTime.format('HH:mm') : '09:00',
        startDate: scheduleConfig.startDate ? scheduleConfig.startDate.format('YYYY-MM-DD') : '',
        hasEndDate: scheduleConfig.hasEndDate,
        endDate: scheduleConfig.endDate ? scheduleConfig.endDate.format('YYYY-MM-DD') : '',
        allowedAccountIds: scheduleConfig.allowedAccountIds
      };
      await axios.post('http://localhost:3001/api/settings/auto-reminder', payloadSchedule);

      // 2. Save Rules
      const formattedRules = productRules.filter(r => r.productName).map(r => ({
        productName: r.productName,
        cycleDays: parseInt(r.cycleDays) || 30,
        remindBeforeDays: parseInt(r.remindBeforeDays) || 3,
        messageContent: r.messageContent,
        attachedImage: r.attachedImage
      }));

      if (formattedRules.length > 0) {
        await axios.post('http://localhost:3001/api/reminder-rules', {
          rules: formattedRules
        });
      }
      
      message.success('Đã lưu Cấu hình Chiến dịch và Lịch chạy!');
      setIsEditMode(false);
      fetchRules();
    } catch (err) {
      message.error('Lỗi lưu cấu hình: ' + err.message);
    }
  };

  const handleAddProduct = () => setProductsBought([...productsBought, { id: Date.now(), name: '', date: null, quantity: 1 }]);
  const handleRemoveProduct = (id) => setProductsBought(productsBought.filter(p => p.id !== id));
  
  const handleAddRule = () => {
    setProductRules([...productRules, { id: Date.now(), productName: '', cycleDays: '', remindBeforeDays: 3, messageContent: '', attachedImage: '' }]);
    setIsEditMode(true);
  };
  
  const handleRemoveRule = async (id) => {
    if (typeof id === 'string') {
      try { 
        await axios.delete(`http://localhost:3001/api/reminder-rules/${id}`); 
      } catch (e) { 
        return message.error('Lỗi xóa cấu hình'); 
      }
    }
    setProductRules(productRules.filter(r => r.id !== id));
    message.success('Đã xóa kịch bản sản phẩm');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb', // blue-600 to match tailwind
          borderRadius: 6,
        },
      }}
    >
      <div className="flex flex-col h-full bg-[#f0f2f5] overflow-hidden relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Chiến dịch nhắc mua lại</h2>
            <p className="text-sm text-gray-500 mt-1">Quản lý và thiết lập tự động chăm sóc khách hàng 24/7</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 flex space-x-6">
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Dữ liệu khách hàng
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Tạo chiến dịch
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'manage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý chiến dịch
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: DỮ LIỆU KHÁCH HÀNG */}
          {activeTab === 'data' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Danh sách khách hàng</h3>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    Import Excel
                  </button>
                  <button 
                    onClick={() => setShowAddCustomerModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <MdAdd className="mr-1" size={18} /> Thêm Khách Hàng Mới
                  </button>
                </div>
              </div>
              
              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tên Khách Hàng</th>
                      <th className="px-4 py-3 font-medium">Số điện thoại</th>
                      <th className="px-4 py-3 font-medium">Sản phẩm theo dõi</th>
                      <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(customer => (
                      <tr key={customer._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4 font-bold text-gray-800">{customer.name}</td>
                        <td className="px-4 py-4">{customer.phone}</td>
                        <td className="px-4 py-4">
                          {customer.trackedProducts && customer.trackedProducts.length > 0 ? (
                            <ul className="space-y-3">
                              {customer.trackedProducts.map(prod => (
                                <li key={prod._id}>
                                  <div className="font-bold text-gray-800">• {prod.productName} (x{prod.quantity || 1})</div>
                                  <div className="text-xs text-gray-500 ml-3 mt-0.5">
                                    Dự kiến hết: {new Date(prod.expectedEmptyDate).toLocaleDateString('vi-VN')}
                                    {prod.hasReminded && <span className="ml-2 text-green-500 font-medium">(Đã nhắc)</span>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-400 italic">Không có sản phẩm</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {customer.status === 'active' ? (
                            <span className="inline-block px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full border border-green-200">Đang hoạt động</span>
                          ) : (
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full border border-gray-200">Ngừng</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center space-x-3 text-lg">
                            <button 
                              onClick={() => handleEditCustomerClick(customer)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-full transition-colors" 
                              title="Sửa"
                            >
                              <MdEdit />
                            </button>
                            <Popconfirm
                              title="Xóa khách hàng"
                              description="Bạn có chắc chắn muốn xóa khách hàng này?"
                              onConfirm={() => handleDeleteCustomer(customer._id)}
                              okText="Có"
                              cancelText="Không"
                            >
                              <button className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors" title="Xóa">
                                <MdDeleteOutline />
                              </button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                           <Empty description="Chưa có dữ liệu khách hàng" />
                        </td>
                      </tr>
                    )}
                    {isLoading && (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                           <Spin />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TẠO CHIẾN DỊCH */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              
              {/* Cấu hình lịch chạy động (Dynamic Schedule) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 relative">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-800">Cấu hình thời gian chạy</h3>
                  {!isEditMode && (
                    <button 
                      onClick={() => setIsEditMode(true)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center shadow-sm border border-blue-100"
                    >
                      <MdEdit className="mr-1" size={16} /> Chỉnh sửa Chiến Dịch
                    </button>
                  )}
                </div>
                
                <div className="space-y-8 opacity-90">
                  {/* Chế độ chạy & Giờ chạy */}
                  <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
                    <div className="text-sm font-medium text-gray-700 mt-1">Chế độ chạy:</div>
                    <div className="flex items-center">
                      <Switch 
                        checked={scheduleConfig.isAutoRun} 
                        onChange={(checked) => setScheduleConfig({...scheduleConfig, isAutoRun: checked})} 
                        disabled={!isEditMode}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-800">Chạy tự động theo lịch (Auto-run)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
                    <div className="text-sm font-medium text-gray-700 mt-2">Giờ chạy hàng ngày:</div>
                    <div>
                      <TimePicker 
                        format="HH:mm"
                        value={scheduleConfig.runTime}
                        onChange={(time) => setScheduleConfig({...scheduleConfig, runTime: time})}
                        allowClear={false}
                        disabled={!scheduleConfig.isAutoRun || !isEditMode}
                        className="w-48"
                        size="large"
                      />
                      <p className="text-xs text-gray-500 mt-2">Hệ thống sẽ tự động quét và gửi tin nhắn vào khung giờ này mỗi ngày.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[180px_1fr] gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">Thời gian bắt đầu:</div>
                    <DatePicker 
                      placeholder="Chọn thời gian bắt đầu"
                      format="DD/MM/YYYY"
                      value={scheduleConfig.startDate}
                      onChange={(date) => setScheduleConfig({...scheduleConfig, startDate: date})}
                      disabled={!scheduleConfig.isAutoRun || !isEditMode}
                      className="w-48"
                      size="large"
                    />
                  </div>

                  <hr className="border-gray-100" />

                  {/* Chế độ kết thúc */}
                  <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
                    <div className="text-sm font-medium text-gray-700 mt-1">Chế độ kết thúc:</div>
                    <div className="flex items-center">
                      <Switch 
                        checked={scheduleConfig.hasEndDate} 
                        onChange={(checked) => setScheduleConfig({...scheduleConfig, hasEndDate: checked})} 
                        disabled={!scheduleConfig.isAutoRun || !isEditMode}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-800">Set lịch dừng hoạt động (Tự động kết thúc chiến dịch)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[180px_1fr] gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">Thời gian kết thúc:</div>
                    <DatePicker 
                      placeholder="Chọn thời gian kết thúc"
                      format="DD/MM/YYYY"
                      value={scheduleConfig.endDate}
                      onChange={(date) => setScheduleConfig({...scheduleConfig, endDate: date})}
                      disabled={!scheduleConfig.hasEndDate || !scheduleConfig.isAutoRun || !isEditMode}
                      className="w-48"
                      size="large"
                    />
                  </div>
                </div>

                {/* Account Selection for Auto Reminder */}
                <hr className="border-gray-100 my-6" />
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="text-blue-500 mr-2">👤</span> Cho phép sử dụng các Tài khoản Gửi sau:
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">Hệ thống sẽ chỉ tự động chọn các tài khoản được tick để gửi Nhắc Mua Lại (Load Balancing). Nếu không chọn cái nào, hệ thống sẽ tự động dùng TẤT CẢ các tài khoản đang có.</div>
                  
                  <div className="flex flex-wrap gap-3">
                    {accounts.map(acc => (
                      <label key={acc.phoneNumber} className={`flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${scheduleConfig.allowedAccountIds.includes(acc.phoneNumber) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input 
                          type="checkbox"
                          disabled={!isEditMode}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                          checked={scheduleConfig.allowedAccountIds.includes(acc.phoneNumber)}
                          onChange={(e) => {
                            if (e.target.checked) setScheduleConfig({...scheduleConfig, allowedAccountIds: [...scheduleConfig.allowedAccountIds, acc.phoneNumber]});
                            else setScheduleConfig({...scheduleConfig, allowedAccountIds: scheduleConfig.allowedAccountIds.filter(id => id !== acc.phoneNumber)});
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">{acc.name || acc.phoneNumber}</span>
                        <span className={`text-xs ${acc.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                          {acc.status === 'active' ? '(Sẵn sàng)' : '(Mất kết nối)'}
                        </span>
                      </label>
                    ))}
                  </div>
                  {accounts.length === 0 && (
                    <span className="text-red-500 text-sm italic">Bạn chưa có tài khoản nào. Vui lòng qua tab Quản lý Tài khoản để thêm.</span>
                  )}
                </div>
              </div>

              {/* Cấu hình Kịch bản */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Cấu hình kịch bản theo Sản phẩm</h3>
                
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  {productRules.map((rule, index) => (
                    <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-4 relative">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase">Cấu hình Sản phẩm {index + 1}</span>
                        <Popconfirm
                          title="Xóa kịch bản"
                          description="Xóa cấu hình này?"
                          onConfirm={() => handleRemoveRule(rule.id)}
                          okText="Có"
                          cancelText="Không"
                          disabled={!isEditMode}
                        >
                          <button disabled={!isEditMode} className="text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors disabled:opacity-50">
                              <MdDeleteOutline size={18} />
                          </button>
                        </Popconfirm>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tên Sản phẩm <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            disabled={!isEditMode}
                            value={rule.productName} 
                            onChange={(e) => setProductRules(productRules.map(r => r.id === rule.id ? {...r, productName: e.target.value} : r))}
                            placeholder="VD: Bỉm Moony Blue M" 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Chu kỳ nhắc (ngày) <span className="text-red-500">*</span></label>
                          <input 
                            type="number" 
                            disabled={!isEditMode}
                            value={rule.cycleDays} 
                            onChange={(e) => setProductRules(productRules.map(r => r.id === rule.id ? {...r, cycleDays: e.target.value} : r))}
                            placeholder="VD: 30" 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nhắc trước (ngày) <span className="text-red-500">*</span></label>
                          <input 
                            type="number" 
                            disabled={!isEditMode}
                            value={rule.remindBeforeDays} 
                            onChange={(e) => setProductRules(productRules.map(r => r.id === rule.id ? {...r, remindBeforeDays: e.target.value} : r))}
                            placeholder="VD: 3" 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" 
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Ảnh đính kèm (Tùy chọn)</label>
                        <div className="flex items-center space-x-3">
                          <label className={`cursor-pointer ${!isEditMode && 'opacity-50 pointer-events-none'}`}>
                            <div className="py-1.5 px-4 rounded-md text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100">
                              Chọn ảnh
                            </div>
                            <input 
                              type="file" 
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                 if (e.target.files && e.target.files[0]) {
                                   const file = e.target.files[0];
                                   const filePath = file.path || file.name;
                                   setProductRules(productRules.map(r => r.id === rule.id ? {...r, attachedImage: filePath} : r))
                                 }
                              }}
                            />
                          </label>
                          <span className="text-xs text-gray-500 truncate max-w-[250px]" title={rule.attachedImage || ''}>
                            {rule.attachedImage ? 'Đã chọn: ' + rule.attachedImage.split('\\').pop().split('/').pop() : 'Chưa có ảnh'}
                          </span>
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nội dung tin nhắn nhắc nhở</label>
                        <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                          <textarea 
                            rows="4" 
                            disabled={!isEditMode}
                            value={rule.messageContent}
                            onChange={(e) => setProductRules(productRules.map(r => r.id === rule.id ? {...r, messageContent: e.target.value} : r))}
                            placeholder="Nhập nội dung tin nhắn. VD: Chào {name}, sản phẩm {product} của bé nhà mình chắc sắp hết rồi..." 
                            className="w-full px-3 py-2 text-sm focus:outline-none resize-none border-none disabled:bg-gray-50 disabled:text-gray-500"
                          ></textarea>
                          <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                            <div className="flex space-x-2 text-xs text-gray-500">
                              <span>Chèn biến:</span>
                              <button className="text-blue-600 font-medium hover:underline">{`{name}`}</button>
                              <button className="text-blue-600 font-medium hover:underline">{`{product}`}</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={handleAddRule}
                    disabled={!isEditMode}
                    className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MdAdd className="mr-1" size={18} /> Thêm cấu hình sản phẩm
                  </button>
                </div>
                
                {isEditMode && (
                  <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => {setIsEditMode(false); fetchRules();}} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
                      Hủy Sửa
                    </button>
                    <button onClick={handleSaveCampaign} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                      Lưu Chiến Dịch
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: QUẢN LÝ CHIẾN DỊCH (LOGS) */}
          {activeTab === 'manage' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-4">Lịch sử hệ thống gửi nhắc nhở tự động</h3>
              
              <Table 
                dataSource={logs} 
                rowKey="_id"
                loading={isLoadingLogs}
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Thời gian',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    render: (text) => <span className="font-medium text-gray-600">{dayjs(text).format('HH:mm - DD/MM/YYYY')}</span>
                  },
                  {
                    title: 'Khách hàng',
                    dataIndex: 'customerName',
                    key: 'customerName',
                    render: (text, record) => (
                      <div>
                        <div className="font-bold text-gray-800">{text}</div>
                        <div className="text-xs text-gray-500">{record.phone}</div>
                      </div>
                    )
                  },
                  {
                    title: 'Sản phẩm',
                    dataIndex: 'productName',
                    key: 'productName',
                    filters: Array.from(new Set(logs.filter(l => l.productName).map(l => l.productName))).map(name => ({ text: name, value: name })),
                    onFilter: (value, record) => record.productName === value,
                  },
                  {
                    title: 'Tài khoản gửi',
                    dataIndex: 'accountId',
                    key: 'accountId',
                    render: (text) => <span className="text-blue-600 font-medium">{text}</span>
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status, record) => (
                      status === 'success' 
                        ? <Tag color="success">Thành công</Tag>
                        : <Popconfirm title="Chi tiết lỗi" description={record.errorMessage} showCancel={false} okText="Đóng"><Tag color="error" className="cursor-pointer">Thất bại (Xem)</Tag></Popconfirm>
                    )
                  }
                ]}
              />
            </div>
          )}

        </div>

        {/* MODAL: THÊM KHÁCH HÀNG MỚI */}
        {showAddCustomerModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">{customerForm.id ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}</h2>
                <button onClick={() => {
                  setShowAddCustomerModal(false);
                  setCustomerForm({ id: null, name: '', phone: '', status: 'active' });
                  setProductsBought([{ id: 1, name: '', date: null, quantity: 1 }]);
                }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <MdClose size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên Khách Hàng <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                      placeholder="VD: Phạm Thu Hương" 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                      placeholder="VD: 0849736456" 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>

                {/* Sản phẩm khách đã mua */}
                <div className="bg-[#f4f7fb] p-5 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-bold text-blue-800 mb-4">Sản phẩm khách đã mua</h4>
                  
                  {productsBought.map((prod, index) => (
                    <div key={prod.id} className="flex space-x-3 items-end mb-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Tên Sản phẩm {index === 0 && <span className="text-gray-400 text-[10px]">?</span>}</label>
                        <input 
                          type="text" 
                          value={prod.name}
                          onChange={(e) => setProductsBought(productsBought.map(p => p.id === prod.id ? {...p, name: e.target.value} : p))}
                          placeholder="VD: Bỉm Moony Blue M" 
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        />
                      </div>
                      <div className="w-[200px]">
                        <label className="block text-xs text-gray-600 mb-1">Ngày mua hàng</label>
                        <DatePicker 
                          format="DD/MM/YYYY"
                          placeholder="Chọn ngày"
                          value={prod.date}
                          onChange={(date) => setProductsBought(productsBought.map(p => p.id === prod.id ? {...p, date: date} : p))}
                          className="w-full"
                          size="large"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-600 mb-1">Số lượng</label>
                        <input 
                          type="number" 
                          value={prod.quantity}
                          onChange={(e) => setProductsBought(productsBought.map(p => p.id === prod.id ? {...p, quantity: e.target.value} : p))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        />
                      </div>
                      {productsBought.length > 1 && (
                         <button onClick={() => handleRemoveProduct(prod.id)} className="mb-2 text-gray-400 hover:text-red-500">
                           <MdDeleteOutline size={22} />
                         </button>
                      )}
                    </div>
                  ))}
                  
                  <button 
                    onClick={handleAddProduct}
                    className="w-full mt-2 py-2 bg-white border border-dashed border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center"
                  >
                    <MdAdd className="mr-1" size={18} /> Thêm sản phẩm
                  </button>
                </div>

              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
                <button onClick={() => {
                  setShowAddCustomerModal(false);
                  setCustomerForm({ id: null, name: '', phone: '', status: 'active' });
                  setProductsBought([{ id: 1, name: '', date: null, quantity: 1 }]);
                }} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleSaveCustomer} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                  Lưu dữ liệu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}
