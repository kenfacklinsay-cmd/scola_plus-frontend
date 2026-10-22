import { useState } from 'react';
import api from '../api/axios';
import './PdfDownloadLink.css';

export default function PrintDocumentLink({ url, className = '', children }) {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState('');

  async function openDocument(event) {
    event.preventDefault();
    if (isOpening) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Autorisez les fenêtres pop-up pour ouvrir le document à imprimer.');
      return;
    }

    setIsOpening(true);
    setError('');

    try {
      const response = await api.get(url, { responseType: 'text' });
      const contentType = response.headers['content-type'] ?? '';
      if (!contentType.toLowerCase().includes('text/html')) {
        throw new Error('Le serveur n’a pas renvoyé le document à imprimer.');
      }

      printWindow.document.open();
      printWindow.document.write(response.data);
      printWindow.document.close();
    } catch (requestError) {
      printWindow.close();
      if (requestError.response?.status === 401) {
        setError('Votre session a expiré. Reconnectez-vous avant d’imprimer ce document.');
      } else {
        setError(requestError.response?.data?.message
          || requestError.message
          || 'Impossible d’ouvrir le document à imprimer.');
      }
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <span className="pdf-download-action">
      <button
        className={`pdf-download-button ${className}`.trim()}
        type="button"
        onClick={openDocument}
        disabled={isOpening}
        aria-busy={isOpening}
      >
        {isOpening ? 'Ouverture…' : children}
      </button>
      {error && <span className="pdf-download-error" role="alert">{error}</span>}
    </span>
  );
}
