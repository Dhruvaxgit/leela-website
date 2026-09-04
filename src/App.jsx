import React, { useState } from 'react';
import Domain from './Domain.jsx';
import Cartpage from './Cartpage.jsx';
import RegistrantForm from './RegistrantForm.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('search');

  return (
    <div>
      <h1>Leela</h1>
      <hr />
      {currentPage === 'search' && (
        <Domain onProceedToCheckout={() => setCurrentPage('cart')} />
      )}
      {currentPage === 'cart' && (
        <Cartpage
          onBackToSearch={() => setCurrentPage('search')}
          onProceedToOwnership={() => setCurrentPage('registrant')}
        />
      )}
      {currentPage === 'registrant' && (
        <RegistrantForm onBackToCart={() => setCurrentPage('cart')} />
      )}
    </div>
  );
}

export default App;
