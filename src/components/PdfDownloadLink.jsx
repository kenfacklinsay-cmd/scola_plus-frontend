import { useState } from 'react';
import api from '../api/axios';
import './PdfDownloadLink.css';

function filenameFromResponse(response, fallbackName) {
  const disposition = response.headers['content-disposition'] ?? '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const regularName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const filename = encodedName
    ? decodeURIComponent(encodedName)
    : regularName ?? fallbackName;

  return filename.replace(/[\\/:*?"<>|]/g, '-');
}

async function responseErrorMessage(blob) {
  const responseText = await blob.text();
  if (!responseText) return '';

  try {
    const responseData = JSON.parse(responseText);
    return responseData.message
      ?? Object.values(responseData.errors ?? {}).flat().join(' ')
      ?? '';
  } catch {
    return responseText;
  }
}

export default function PdfDownloadLink({
  url,
  className = '',
  fallbackName = 'document.pdf',
  children,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function download(event) {
    event.preventDefault();
    if (isDownloading) return;

    setIsDownloading(true);
    setError('');

    try {
      const response = await api.get(url, { responseType: 'blob' });
      const contentType = response.headers['content-type'] ?? '';
      if (!contentType.toLowerCase().includes('application/pdf')) {
        const message = await responseErrorMessage(response.data);
        throw new Error(message || 'Le serveur n’a pas renvoyé un document PDF.');
      }

      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filenameFromResponse(response, fallbackName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      if (requestError.response?.data instanceof Blob) {
        const message = await responseErrorMessage(requestError.response.data);
        setError(message || 'Le téléchargement du PDF a échoué.');
      } else {
        setError(requestError.message || 'Le téléchargement du PDF a échoué.');
      }
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="pdf-download-action">
      <button
        className={`pdf-download-button ${className}`.trim()}
        type="button"
        onClick={download}
        disabled={isDownloading}
        aria-busy={isDownloading}
      >
        {isDownloading ? 'Téléchargement…' : children}
      </button>
      {error && <span className="pdf-download-error" role="alert">{error}</span>}
    </span>
  );
}
