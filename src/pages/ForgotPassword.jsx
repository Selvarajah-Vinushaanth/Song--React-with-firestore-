import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Check your email for further instructions');
    } catch (err) {
      setError('Failed to reset password');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Decorative gradient circles */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>
      <Header />
      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-2xl w-full space-y-10 bg-gray-800/40 backdrop-blur-md p-12 rounded-xl shadow-2xl border border-gray-700/50">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-white">Reset Password</h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              Enter your email to receive a password reset link
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{message}</span>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {loading ? 'Sending...' : 'Reset Password'}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-center mt-4">
            <Link to="/login" className="text-sm text-purple-400 hover:text-purple-300">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
