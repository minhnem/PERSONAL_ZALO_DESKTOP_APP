import React, { useState } from 'react';
import {
  MdDashboard,
  MdAccountCircle,
  MdMessage,
  MdPeople,
  MdGroup,
  MdSettings,
  MdBarChart,
  MdAttachMoney,
  MdShare,
  MdTableChart,
  MdList,
  MdAutorenew
} from 'react-icons/md';
import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdLogout } from 'react-icons/md';

const Sidebar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({
    nhanTin: true,
  });

  const toggleMenu = (key) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-[260px] bg-[#F9FAFB] border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-10">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white font-bold mr-3">
          {/* Logo placeholder */}
          <span className="text-sm">A</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-800 leading-tight">AutoZalo</h1>
          <span className="text-xs text-gray-500">v2.0.1</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="px-4 space-y-1">
          <li>
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
              <MdDashboard className="mr-3 text-gray-400" size={20} />
              Tổng quan
            </a>
          </li>

          <li
            className={`flex items-center px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/accounts' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
            onClick={() => navigate('/accounts')}
          >
            <MdAccountCircle size={22} className="mr-3" />
            Tài khoản Zalo
          </li>

          <li
            className={`flex items-center px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/campaigns' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
            onClick={() => navigate('/campaigns')}
          >
            <MdList size={22} className="mr-3" />
            Gửi tin hàng loạt
          </li>

          {/* Menu Auto Reminders */}
          <li
            className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/auto-reminders' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
            onClick={() => navigate('/auto-reminders')}
          >
            <div className="flex items-center">
              <MdAutorenew className={`mr-3 ${location.pathname === '/auto-reminders' ? 'text-blue-600' : 'text-gray-600'}`} size={20} />
              Chiến dịch nhắc mua lại
            </div>
          </li>

          {/* Dropdown 1 */}
          <li
            className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
            onClick={() => navigate('/')}
          >
            <div className="flex items-center">
              <MdMessage className={`mr-3 ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-600'}`} size={20} />
              Nhắn tin
            </div>
          </li>

          {/* Menu Bạn bè */}
          <li
            className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/friends' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
            onClick={() => navigate('/friends')}
          >
            <div className="flex items-center">
              <MdPeople className={`mr-3 ${location.pathname === '/friends' ? 'text-blue-600' : 'text-gray-600'}`} size={20} />
              Bạn bè Zalo
            </div>
          </li>

          {/* Menu Số lạ Excel */}
          <li
            className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/excel-contacts' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
            onClick={() => navigate('/excel-contacts')}
          >
            <div className="flex items-center">
              <MdTableChart className={`mr-3 ${location.pathname === '/excel-contacts' ? 'text-blue-600' : 'text-gray-600'}`} size={20} />
              Quản lý dữ liệu Excel
            </div>
          </li>

          {/* Menu Nhóm Zalo */}
          <li
            className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/groups' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
            onClick={() => navigate('/groups')}
          >
            <div className="flex items-center">
              <MdGroup className={`mr-3 ${location.pathname === '/groups' ? 'text-blue-600' : 'text-gray-600'}`} size={20} />
              Nhóm Zalo
            </div>
          </li>

          {/* Menu Cài đặt - Chỉ hiển thị cho Admin */}
          {user?.role === 'admin' && (
            <li
              className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium ${location.pathname === '/settings' ? 'bg-[#e5f0ff] text-blue-600 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
              onClick={() => navigate('/settings')}
            >
              <div className="flex items-center">
                <MdSettings className={`mr-3 ${location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-600'}`} size={20} />
                Cài đặt
              </div>
            </li>
          )}

          <li>
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
              <MdBarChart className="mr-3 text-gray-400" size={20} />
              Báo cáo
            </a>
          </li>

          <li>
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors uppercase">
              <MdAttachMoney className="mr-3 text-gray-400" size={20} />
              BẢNG GIÁ
            </a>
          </li>

          <li>
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
              <MdShare className="mr-3 text-gray-400" size={20} />
              Affiliate
            </a>
          </li>
        </ul>
      </nav>

      {/* Bottom Area - Subscription Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">GÓI ĐANG DÙNG</span>
          <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded font-bold border border-brand/20">AGENCY</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-4 flex justify-center mr-2"><MdDashboard size={14} /></span>
            Còn 365 ngày
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-4 flex justify-center mr-2"><MdAccountCircle size={14} /></span>
            1/100 Zalo
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <MdLogout className="mr-2" size={16} />
            Đăng xuất
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          © 2026 AutoZalo. All rights reserved.
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
