import React from 'react';
import { IoChatbubbleOutline, IoNotificationsOutline, IoHelpCircleOutline, IoChevronDownOutline } from 'react-icons/io5';

const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Left Area - Account Selector */}
      <div className="flex items-center">
        <div className="p-2 mr-2 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer">
          <IoChatbubbleOutline size={22} />
        </div>
        
        <button className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <img src="https://ui-avatars.com/api/?name=Thanh+Digital&background=0D8ABC&color=fff" alt="Avatar" className="w-6 h-6 rounded-full" />
          <span className="text-sm font-medium text-gray-700">Thành Digital Ai</span>
          <IoChevronDownOutline className="text-gray-500" size={16} />
        </button>
      </div>

      {/* Right Area - Actions & Profile */}
      <div className="flex items-center space-x-4">
        {/* Warning Badge */}
        <div className="flex items-center text-warning bg-warning-light border border-warning/30 px-3 py-1.5 rounded-full text-xs font-semibold">
          <span className="mr-1">⚠️</span>
          1/100 tài khoản
        </div>
        
        {/* Icons */}
        <div className="flex items-center space-x-1">
          <button className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors relative">
            <IoNotificationsOutline size={22} />
          </button>
          <button className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <IoHelpCircleOutline size={22} />
          </button>
          {/* Palette Icon placeholder */}
          <button className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="22" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M12 21a9 9 0 0 1 0-18c4.97 0 9 3.58 9 8a3 3 0 0 1-3 3h-1.89a1 1 0 0 0-.11 1.99l.11.01c.55 0 1 .45 1 1a3 3 0 0 1-3 3H12zm0-14a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-4 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-4 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path></svg>
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center pl-2 border-l border-gray-200 cursor-pointer">
          <div className="text-right mr-3 hidden md:block">
            <div className="text-sm font-semibold text-gray-800">sinhthanh.dev</div>
            <div className="text-xs text-gray-500">Người dùng</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm border-2 border-white ring-2 ring-gray-100">
            S
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
