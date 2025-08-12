import './AppointmentModal.css'; // 팝업창 스타일을 위한 CSS 파일

function AppointmentModal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>
          &times; {/* 이것은 'X' 모양 아이콘입니다 */}
        </button>
        {children}
      </div>
    </div>
  );
}

export default AppointmentModal;