import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-100 py-4 px-6 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Quical" className="w-10 h-10 rounded-lg" />
          <h1 className="text-lg font-bold text-black tracking-tight">Quical</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;