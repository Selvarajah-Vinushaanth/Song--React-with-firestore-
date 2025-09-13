// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Global Jest mocks for Firebase and Auth context to avoid real network/init during tests
import React from 'react';

// React Router v7 is ESM-only and not supported by CRA's Jest (Jest 27).
// Provide a lightweight mock so components can import and tests can render.
jest.mock('react-router-dom', () => {
     const React = require('react');

     const RouterContext = React.createContext({ pathname: '/', search: '', hash: '' });

     return {
          BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'mock-browser-router' }, children),
          Routes: ({ children }) => React.createElement('div', { 'data-testid': 'mock-routes' }, children),
          Route: ({ children, element }) => React.createElement('div', { 'data-testid': 'mock-route' }, element || children),
          Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
          NavLink: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
          Navigate: () => React.createElement('div', { 'data-testid': 'mock-navigate' }),
          Outlet: () => React.createElement('div', { 'data-testid': 'mock-outlet' }),
          useNavigate: () => jest.fn(),
          useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
          useParams: () => ({}),
          useSearchParams: () => [new URLSearchParams(), jest.fn()],
          createBrowserRouter: jest.fn(),
          RouterProvider: ({ children }) => React.createElement('div', { 'data-testid': 'mock-router-provider' }, children),
     };
}, { virtual: true });

// Basic Firebase mocks to satisfy modules imported in app code
jest.mock('firebase/app', () => ({
	initializeApp: jest.fn(() => ({ __mocked: true })),
}));

jest.mock('firebase/auth', () => ({
	getAuth: jest.fn(() => ({})),
	createUserWithEmailAndPassword: jest.fn(async () => ({ user: { uid: 'test' } })),
	signInWithEmailAndPassword: jest.fn(async () => ({ user: { uid: 'test' } })),
	signOut: jest.fn(async () => {}),
	onAuthStateChanged: jest.fn((auth, cb) => { try { cb(null); } catch {} return () => {}; }),
	GoogleAuthProvider: jest.fn(function GoogleAuthProvider() { return {}; }),
	signInWithPopup: jest.fn(async () => ({ user: { uid: 'test' } })),
	sendPasswordResetEmail: jest.fn(async () => {}),
	updateProfile: jest.fn(async () => {}),
}));

jest.mock('firebase/firestore', () => ({
	getFirestore: jest.fn(() => ({})),
	collection: jest.fn(() => ({})),
	getDocs: jest.fn(async () => ({ docs: [] })),
	orderBy: jest.fn(() => ({})),
	query: jest.fn(() => ({})),
	limit: jest.fn(() => ({})),
	addDoc: jest.fn(async () => ({ id: 'mock-id' })),
	deleteDoc: jest.fn(async () => {}),
	doc: jest.fn(() => ({})),
	writeBatch: jest.fn(() => ({ delete: jest.fn(), commit: jest.fn(async () => {}) })),
	serverTimestamp: jest.fn(() => new Date()),
}));

// Default AuthContext mock that tests can override via global.__AUTH_MOCK__
global.__AUTH_MOCK__ = {
	currentUser: null,
	signup: jest.fn(),
	login: jest.fn(),
	logout: jest.fn(),
	signInWithGoogle: jest.fn(),
	resetPassword: jest.fn(),
	updateUserProfile: jest.fn(),
};

jest.mock('./context/AuthContext', () => {
	const React = require('react');
	return {
		useAuth: () => (global.__AUTH_MOCK__ || { currentUser: null }),
		AuthProvider: ({ children }) => React.createElement(React.Fragment, null, children),
		db: {},
		auth: {},
	};
});

