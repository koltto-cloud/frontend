// @ts-nocheck
import { useState } from 'react';

/**
 * useLogin
 * Handles authentication against the Cloudey API.
 * Edit this file to customize login behaviour.
 */
export const useLogin = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login/token`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        setError('Invalid email or password. Please try again.');
        return;
      }

      const data = await response.json();
      localStorage.setItem('cloudey_access_token', data.access_token);

      // Redirect by role: staff -> /admin/overview, customer -> /
      try {
        const meRes = await fetch(`${API_URL}/api/identity/users/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          window.location.href = me?.user_type === 'staff' ? '/admin/overview' : '/';
        } else {
          window.location.href = '/';
        }
      } catch {
        window.location.href = '/';
      }

    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { email, setEmail, password, setPassword, error, loading, handleLogin };
};
