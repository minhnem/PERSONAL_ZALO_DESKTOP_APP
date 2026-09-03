import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { MdSettings, MdRefresh } from 'react-icons/md';

// Safely require electron if available
const { ipcRenderer } = window.require ? window.require('electron') : {};

// Bọc webview bằng React.memo để ngăn React re-render và gán lại thuộc tính src
// Việc gán lại thuộc tính src (dù là cùng 1 URL) sẽ làm Electron webview tải lại trang
const MemoizedWebview = React.memo(({ accountId, webviewRef, isScanning }) => {
  return (
    <webview
      ref={webviewRef}
      partition={`persist:zalo_${accountId}`}
      src={isScanning ? "about:blank" : "https://chat.zalo.me"}
      className="w-full h-full border-none"
      allowpopups="true"
    />
  );
});

export default function Accounts() {
  const webviewRef = useRef(null);

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isWebviewLoading, setIsWebviewLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetchAccounts();
    // Khởi tạo Polling 3s/lần để liên tục cập nhật trạng thái kết nối và cờ isWorkerRunning từ Server
    const interval = setInterval(fetchAccounts, 3000);
    return () => clearInterval(interval);
  }, []);

  // Refs để giữ giá trị mới nhất mà không gây re-render
  const accountsRef = useRef(accounts);
  const isSyncingRef = useRef(isSyncing);

  useEffect(() => {
    accountsRef.current = accounts;
    isSyncingRef.current = isSyncing;
  }, [accounts, isSyncing]);

  // Lắng nghe sự kiện tải trang của Webview và Auto-sync
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !selectedAccountId) return;

    let initialLoadDone = false;
    setIsWebviewLoading(true); // Luôn hiện loading khi mới chuyển tab tài khoản

    const handleStart = () => {
      if (!initialLoadDone) setIsWebviewLoading(true);
    };
    const handleStop = async () => {
      initialLoadDone = true;
      setIsWebviewLoading(false);
      // Kiểm tra đăng nhập ngay khi trang vừa tải xong (nhanh hơn vòng lặp)
      try {
        // Kiểm tra xem đã đăng nhập thành công chưa (tìm thanh tìm kiếm)
        const isLogged = await webview.executeJavaScript("!!document.getElementById('contact-search-input')");
        const currentAccount = accountsRef.current.find(a => a.phoneNumber === selectedAccountId);
        if (isLogged && currentAccount && currentAccount.status !== 'active' && !isSyncingRef.current) {
          console.log('Tự động đồng bộ session sau khi tải xong...');
          handleSyncSession();
        }
      } catch (e) { }
    };

    webview.addEventListener('did-start-loading', handleStart);
    webview.addEventListener('did-stop-loading', handleStop);

    // Vòng lặp dự phòng (Fallback) mỗi 5s
    const checkLoginInterval = setInterval(async () => {
      try {
        const isLogged = await webview.executeJavaScript("!!document.getElementById('contact-search-input')");
        const currentAccount = accountsRef.current.find(a => a.phoneNumber === selectedAccountId);
        if (isLogged && currentAccount && currentAccount.status !== 'active' && !isSyncingRef.current) {
          console.log('Tự động đồng bộ session (từ vòng lặp)...');
          handleSyncSession();
        }
      } catch (e) { }
    }, 5000);

    return () => {
      webview.removeEventListener('did-start-loading', handleStart);
      webview.removeEventListener('did-stop-loading', handleStop);
      clearInterval(checkLoginInterval);
    };
  }, [selectedAccountId]);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/accounts');
      if (res.data.success) {
        setAccounts(res.data.data);
        if (res.data.data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(res.data.data[0].phoneNumber);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách tài khoản', err);
    }
  };

  const handleAddAccount = () => {
    // Tự động sinh ID thay vì dùng prompt (để tránh lỗi bị chặn trên Electron)
    const newId = 'TK_' + Math.floor(1000 + Math.random() * 9000);
    const newAccount = { phoneNumber: newId, name: newId, status: 'disconnected' };
    setAccounts([...accounts, newAccount]);
    setSelectedAccountId(newId);
  };

  const handleDeleteAccount = async (accId, e) => {
    e.stopPropagation(); // Không chọn tab khi bấm nút xóa
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa tài khoản này và giải phóng bộ nhớ?');
    if (!confirmDelete) return;

    try {
      // 1. Xóa khỏi DB (nếu có)
      await axios.delete(`http://localhost:3001/api/accounts/${accId}`).catch(() => { });

      // 2. Xóa khỏi phân vùng Electron (Giải phóng ổ cứng)
      if (ipcRenderer) {
        // [COMBO LOGOUT] Thử đăng xuất khỏi Server Zalo trước khi xóa phân vùng
        if (accId === selectedAccountId && webviewRef.current) {
          setIsLoggingOut(true);
          try {
            await webviewRef.current.executeJavaScript(`
              try {
                // 1. Click vào Avatar để mở menu
                const avatarBtn = document.querySelector('.zl-avatar, .avatar-settings');
                if (avatarBtn) avatarBtn.click();
                
                // 2. Đợi menu xổ ra, tìm và click "Đăng xuất"
                setTimeout(() => {
                  const items = document.querySelectorAll('*');
                  for (let el of items) {
                    if (el.innerText === 'Đăng xuất' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                      el.click();
                      break;
                    }
                  }
                  
                  // 3. Đợi hộp thoại xác nhận hiện ra, click "Đăng xuất" lần 2 (nút đỏ)
                  setTimeout(() => {
                    const confirmBtns = document.querySelectorAll('.btn-danger, .modal-footer .btn');
                    for (let btn of confirmBtns) {
                      if (btn.innerText === 'Đăng xuất') {
                        btn.click();
                        break;
                      }
                    }
                  }, 300);
                }, 300);
              } catch (err) {}
            `);

            // Đợi 1.5 giây cho Zalo kịp gọi API đăng xuất lên Server
            await new Promise(resolve => setTimeout(resolve, 1500));
          } catch (e) {
            console.error('Lỗi khi chạy kịch bản đăng xuất ngầm', e);
          } finally {
            setIsLoggingOut(false);
          }
        }

        await ipcRenderer.invoke('clear-partition', accId);
      }

      // 3. Cập nhật giao diện
      const newAccounts = accounts.filter(a => a.phoneNumber !== accId);
      setAccounts(newAccounts);
      if (selectedAccountId === accId) {
        setSelectedAccountId(newAccounts.length > 0 ? newAccounts[0].phoneNumber : null);
      }
    } catch (err) {
      alert('Lỗi khi xóa tài khoản: ' + err.message);
    }
  };

  const handleScanContacts = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản');
    try {
      setIsScanning(true);
      const res = await axios.post('http://localhost:3001/api/accounts/sync', {
        accountId: selectedAccountId
      });
      if (res.data.success) {
        alert('Đã quét và đồng bộ danh bạ thành công!');
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Gửi lệnh thất bại: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSyncSession = async () => {
    if (!selectedAccountId) return alert('Vui lòng chọn tài khoản');
    try {
      if (!ipcRenderer) {
        alert('Tính năng này chỉ hoạt động trong Desktop App!');
        return;
      }
      setIsSyncing(true);
      const webview = webviewRef.current;

      // 1. Ép Electron ghi toàn bộ dữ liệu (IndexedDB, Cookies) xuống ổ cứng
      await ipcRenderer.invoke('flush-session-data', selectedAccountId);

      // (Nâng cao) Thử trích xuất Tên thật từ Zalo
      let realName = selectedAccountId;
      try {
        const extractedName = await webview.executeJavaScript(`
          new Promise((resolve) => {
            try {
              const avatarBtn = document.querySelector('.zl-avatar, .avatar-settings, .nav__tabs__avatar');
              if (avatarBtn) {
                avatarBtn.click();
                setTimeout(() => {
                  let foundName = null;
                  // Look for common name container classes in the popover
                  const nameEls = document.querySelectorAll('.popover-v2 .truncate, .zmenu-body .truncate, .user-name, [data-id="div_Profile_Name"]');
                  
                  for (let el of nameEls) {
                    const text = el.innerText?.trim();
                    if (text && text.length > 1 && text !== 'Hồ sơ của bạn' && text !== 'Cài đặt' && text !== 'Đăng xuất') {
                      foundName = text;
                      break;
                    }
                  }

                  // Fallback: grab the very first piece of text in the popover
                  if (!foundName) {
                    const popover = document.querySelector('.popover-v2, .zmenu-body, .menu-profile');
                    if (popover) {
                      const allDivs = popover.querySelectorAll('div');
                      for (let div of allDivs) {
                        const text = div.innerText?.trim();
                        // Get the first text that has no child elements (leaf node)
                        if (text && div.children.length === 0) {
                          foundName = text;
                          break;
                        }
                      }
                    }
                  }

                  // Đóng menu bằng cách click lại vào avatar hoặc ra ngoài
                  const closeBtn = document.getElementById('contact-search-input') || avatarBtn;
                  if (closeBtn) closeBtn.click();

                  resolve(foundName);
                }, 600); // Đợi 600ms cho menu render xong
              } else {
                resolve(null);
              }
            } catch(e) {
              resolve(null);
            }
          });
        `);
        if (extractedName && extractedName.trim() !== '') {
          realName = extractedName.trim();
        }
      } catch (e) {
        console.error('Lỗi khi lấy tên:', e);
      }

      // 3. Gửi lên Backend yêu cầu Copy Profile vật lý
      const res = await axios.post('http://localhost:3001/api/accounts/sync-session', {
        accountId: selectedAccountId,
        name: realName
      });

      if (res.data.success) {
        alert('Đồng bộ phiên đăng nhập thành công!');
        fetchAccounts(); // Cập nhật lại list
      } else {
        alert('Lỗi: ' + res.data.error);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.message;
      alert('Đồng bộ thất bại: ' + errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-row h-full bg-[#f0f2f5] overflow-hidden">
      {/* Sidebar Accounts */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Tài khoản Zalo</h2>
          <button
            onClick={handleAddAccount}
            className="mt-3 w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            + Thêm Tài khoản
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {accounts.map(acc => (
            <div
              key={acc.phoneNumber}
              onClick={() => setSelectedAccountId(acc.phoneNumber)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center ${selectedAccountId === acc.phoneNumber ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
            >
              <div>
                <p className="font-medium text-gray-800">{acc.name || acc.phoneNumber}</p>
                <p className="text-xs text-gray-500 mt-1">{acc.status === 'active' ? '🟢 Đang kết nối' : '⚪ Chưa đồng bộ'}</p>
              </div>
              <button
                onClick={(e) => handleDeleteAccount(acc.phoneNumber, e)}
                className="text-red-400 hover:text-red-600 px-2 py-1 text-xs"
                title="Xóa tài khoản và giải phóng bộ nhớ"
              >
                Xóa
              </button>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="p-4 text-sm text-gray-500 text-center">
              Chưa có tài khoản nào. Hãy thêm mới!
            </div>
          )}
        </div>
      </div>

      {/* Main Webview Area */}
      <div className="flex-1 flex flex-col relative bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tài khoản: {selectedAccountId || 'Chưa chọn'}</h2>
            <p className="text-sm text-gray-500 mt-1">Đăng nhập tài khoản để đồng bộ hệ thống</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleScanContacts}
              disabled={isScanning || !selectedAccountId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isScanning ? 'Đang quét...' : 'Quét Danh Bạ'}
            </button>
            <button
              onClick={handleSyncSession}
              disabled={isSyncing || !selectedAccountId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ lên Server'}
            </button>
            <button
              onClick={() => webviewRef.current?.openDevTools()}
              disabled={!selectedAccountId}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center"
            >
              <MdSettings className="mr-2" size={18} />
              DevTools
            </button>
            <button
              onClick={() => webviewRef.current?.reload()}
              disabled={!selectedAccountId}
              className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center"
            >
              <MdRefresh className="mr-2" size={18} />
              Làm mới Zalo
            </button>
          </div>
        </div>

        {/* Webview Container */}
        <div className="flex-1 relative bg-white">
          {selectedAccountId ? (
            (() => {
              const currentAccount = accounts.find(a => a.phoneNumber === selectedAccountId);
              // Kiểm tra xem chiến dịch có đang chạy không (nếu có API trả về cờ này sau này)
              const isWorkerRunning = currentAccount?.isWorkerRunning || false;
              // Nếu đang quét (isScanning) hoặc worker đang chạy, ta sẽ ngắt kết nối trình duyệt
              const shouldDisconnect = isScanning || isWorkerRunning;

              return (
                <>
                  {(isWebviewLoading || isSyncing || isLoggingOut || shouldDisconnect) && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                      <p className="text-gray-700 font-medium text-sm text-center px-4">
                        {isLoggingOut ? 'Đang đăng xuất khỏi Server Zalo...' : (shouldDisconnect ? 'Đang nhường quyền cho Server ngầm hoạt động. Vui lòng chờ...' : (isSyncing ? 'Đang đồng bộ dữ liệu lên Server...' : 'Đang tải Zalo...'))}
                      </p>
                    </div>
                  )}
                  <MemoizedWebview key={selectedAccountId} accountId={selectedAccountId} webviewRef={webviewRef} isScanning={shouldDisconnect} />
                </>
              );
            })()
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Vui lòng chọn hoặc thêm tài khoản để tiếp tục
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
