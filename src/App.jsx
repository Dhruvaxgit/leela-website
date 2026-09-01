import React, { useState } from 'react';
import Domain from './Domain.jsx';
import Cartpage from './Cartpage.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('search');

  return (
    <div>
      <h1>Leela</h1>
      <hr />
      {currentPage === 'search' ? (
        <Domain onProceedToCheckout={() => setCurrentPage('cart')} />
      ) : (
        <Cartpage onBackToSearch={() => setCurrentPage('search')} />
      )}
    </div>
  );
}

export default App;
