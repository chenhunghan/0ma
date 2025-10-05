import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

// Mock Tauri window API
jest.mock('@tauri-apps/api/window', () => ({
  appWindow: {
    setTitle: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    close: jest.fn(),
    isMaximized: jest.fn().mockResolvedValue(false),
    isMinimized: jest.fn().mockResolvedValue(false),
    isFocused: jest.fn().mockResolvedValue(true),
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

// Mock Tauri dialog API
jest.mock('@tauri-apps/api/dialog', () => ({
  open: jest.fn(),
  save: jest.fn(),
  ask: jest.fn(),
  confirm: jest.fn(),
  message: jest.fn(),
}));

// Mock Tauri fs API
jest.mock('@tauri-apps/api/fs', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  exists: jest.fn(),
  createDir: jest.fn(),
}));

// Mock Tauri path API
jest.mock('@tauri-apps/api/path', () => ({
  join: jest.fn((...paths) => paths.join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn((path) => path.split('.').pop()),
}));

// Mock Tauri notification API
jest.mock('@tauri-apps/api/notification', () => ({
  sendNotification: jest.fn(),
  requestPermission: jest.fn().mockResolvedValue('granted'),
  isPermissionGranted: jest.fn().mockResolvedValue(true),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    zIndex: '0',
  }),
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url'),
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
});

// Mock File and FileReader
global.File = jest.fn().mockImplementation((content, name, options) => ({
  content,
  name,
  type: options?.type || '',
  size: content?.length || 0,
  lastModified: Date.now(),
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  result: null,
  onload: null,
  onerror: null,
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock navigator properties
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
});

Object.defineProperty(navigator, 'share', {
  value: jest.fn().mockResolvedValue(undefined),
});

// Suppress console warnings and errors in tests unless debugging
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.createMockEvent = (type: string, properties = {}) => ({
  type,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: { value: '' },
  ...properties,
});

global.createMockFile = (name: string, content: string, type = 'text/plain') => {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'content', { value: content });
  return file;
};

// Test environment setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset localStorage and sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();

  // Reset window.location
  delete (window as any).location;
  window.location = { ...window.location, href: 'http://localhost:3000' };
});