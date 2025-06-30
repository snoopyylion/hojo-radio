// utils/apiDebugHelper.ts
import { useAuth } from '@clerk/nextjs';

export interface DebugInfo {
  environment: string;
  apiUrl: string;
  hasToken: boolean;
  tokenPreview: string;
  timestamp: string;
  userAgent: string;
  isOnline: boolean;
}

export const useApiDebugger = () => {
  const { getToken, userId } = useAuth();

  const getDebugInfo = async (): Promise<DebugInfo> => {
    const token = await getToken();
    
    return {
      environment: process.env.NODE_ENV || 'unknown',
      apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'No token',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      isOnline: navigator.onLine
    };
  };

  const testApiConnection = async () => {
    const debug = await getDebugInfo();
    console.log('🔍 API Debug Info:', debug);

    // Test basic connectivity
    try {
      const testUrl = `${debug.apiUrl}/health`;
      console.log(`🔄 Testing connection to: ${testUrl}`);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`📡 Connection test result: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log('✅ API is reachable:', data);
      } else {
        console.log('❌ API responded with error:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to reach API:', error);
    }

    // Test authenticated endpoint
    if (debug.hasToken) {
      try {
        const token = await getToken();
        const authTestUrl = `${debug.apiUrl}/auth/me`;
        console.log(`🔄 Testing authenticated endpoint: ${authTestUrl}`);
        
        const authResponse = await fetch(authTestUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log(`🔐 Auth test result: ${authResponse.status} ${authResponse.statusText}`);
        
        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('✅ Authentication working:', authData);
        } else {
          console.log('❌ Authentication failed:', authResponse.status);
        }
      } catch (error) {
        console.error('❌ Auth test failed:', error);
      }
    }

    return debug;
  };

  const logNetworkError = (error: any, context: string) => {
    console.group(`❌ Network Error in ${context}`);
    console.error('Error:', error);
    console.log('User ID:', userId);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Online status:', navigator.onLine);
    console.log('User agent:', navigator.userAgent);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.log('🔍 This is likely a network connectivity issue or CORS problem');
      console.log('Possible causes:');
      console.log('- API server is not running');
      console.log('- Incorrect API URL configuration');
      console.log('- CORS not configured properly');
      console.log('- Network connectivity issues');
      console.log('- Firewall blocking the request');
    }
    
    console.groupEnd();
  };

  return {
    getDebugInfo,
    testApiConnection,
    logNetworkError
  };
};

// Console command to run debug test
// You can run this in browser console: window.debugApi()
if (typeof window !== 'undefined') {
  (window as any).debugApi = async () => {
    console.log('🔍 Starting API debug test...');
    
    // Basic connectivity tests
    const tests = [
      { name: 'Localhost API', url: 'http://localhost:3000/api/health' },
      { name: 'Relative API', url: '/api/health' },
      { name: 'External API', url: process.env.NEXT_PUBLIC_API_URL + '/health' }
    ];
    
    for (const test of tests) {
      try {
        console.log(`🔄 Testing ${test.name}: ${test.url}`);
        const response = await fetch(test.url);
        console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`❌ ${test.name} failed:`, error);
      }
    }
  };
}