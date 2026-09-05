import React, { useState } from 'react';
import Domain from './Domain.jsx';
import Cartpage from './Cartpage.jsx';
import RegistrantForm from './RegistrantForm.jsx';
import Purchasecompletionpage from './Purchasecompletionpage.jsx';

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
        <RegistrantForm
          onBackToCart={() => setCurrentPage('cart')}
          onProceedToCompletion={() => setCurrentPage('completion')}
        />
      )}
      {currentPage === 'completion' && (
        <Purchasecompletionpage
          onBackToForm={() => setCurrentPage('registrant')}
        />
      )}
    </div>
  );
}

export default App;
