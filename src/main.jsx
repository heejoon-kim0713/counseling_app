import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import AuthProvider from './lib/AuthContext.jsx' // 이 줄 추가

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* AuthProvider로 App을 감싸줍니다 */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)