import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function getResponseData(response) {
  return response.data?.data ?? response.data;
}

export function getRequestError(error) {
  return error.response?.data?.message || 'Impossible de charger les données. Vérifiez la connexion au serveur.';
}

export function formatAmount(amount) {
  const value = Number(amount);
  return Number.isFinite(value)
    ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)
    : '—';
}

export function useRoleErrorNavigation() {
  const navigate = useNavigate();
  return useCallback((error) => {
    if (error.response?.status === 401) {
      navigate('/login', { replace: true });
      return true;
    }
    return false;
  }, [navigate]);
}
