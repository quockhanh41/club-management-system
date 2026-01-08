import { request, APIRequestContext } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    full_name: string;
  };
}

export class APIHelper {
  private apiContext: APIRequestContext | null = null;
  private readonly baseURL: string;
  private readonly gatewaySecret: string;

  constructor() {
    this.baseURL = process.env.API_GATEWAY_URL || 'http://localhost:8000';
    // Prefer Playwright-provided secret in CI, fall back to repo .env, then compose default
    this.gatewaySecret = process.env.API_GATEWAY_SECRET
      || process.env.NEXT_PUBLIC_API_GATEWAY_SECRET
      || 'test-secret-e2e';
  }

  async getAPIContext(): Promise<APIRequestContext> {
    if (!this.apiContext) {
      this.apiContext = await request.newContext({
        baseURL: this.baseURL,
        extraHTTPHeaders: {
          'x-api-gateway-secret': this.gatewaySecret,
          'Content-Type': 'application/json',
        },
      });
    }
    return this.apiContext;
  }

  async waitForAPIGateway(timeout = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Test Kong proxy API to verify it's running
        // Use baseURL instead of hardcoded localhost to support both CI and local environments
        const response = await fetch(this.baseURL);
        // Kong will return 404 if no route matches, which means it's working
        if (response.status === 404 || response.ok) {
          return;
        }
      } catch (error) {
        // Continue trying
      }
      await this.sleep(2000);
    }
    throw new Error(`API Gateway not ready after ${timeout}ms`);
  }

  async waitForService(serviceName: string, healthPath: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    const api = await this.getAPIContext();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await api.get(healthPath);
        // Consider 200, 204 OK; treat 401/403 as misconfiguration instead of retrying forever
        if (response.ok()) {
          return;
        } else if ([401, 403].includes(response.status())) {
          const details = await response.text().catch(() => '');
          throw new Error(`${serviceName} health unauthorized/forbidden via gateway (check API_GATEWAY_SECRET). Status=${response.status()} Body=${details}`);
        } else if (response.status() === 404) {
          // Likely wrong path mapping
          throw new Error(`${serviceName} health path not found at ${healthPath} (check kong.yml routes)`);
        }
      } catch (error) {
        // Continue trying
      }
      await this.sleep(1000);
    }
    throw new Error(`${serviceName} service not ready after ${timeout}ms`);
  }

  async waitForDirectService(serviceName: string, url: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Continue trying
      }
      await this.sleep(1000);
    }
    throw new Error(`${serviceName} service not ready after ${timeout}ms`);
  }

  async registerUser(userData: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<{ success: boolean; message: string; user?: any }> {
    const api = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'x-api-gateway-secret': this.gatewaySecret,
        'Content-Type': 'application/json',
      },
    });
    const response = await api.post('/api/auth/register', {
      data: userData,
    });
    
    const json = await response.json();
    await api.dispose();
    return json;
  }

  async loginUser(credentials: {
    email: string;
    password: string;
  }): Promise<AuthTokens> {
    const api = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'x-api-gateway-secret': this.gatewaySecret,
        'Content-Type': 'application/json',
      },
    });
    const response = await api.post('/api/auth/login', {
      data: credentials,
    });
    
    if (!response.ok()) {
      const error = await response.json();
      await api.dispose();
      throw new Error(`Login failed: ${error.message}`);
    }
    
    const result = await response.json();
    await api.dispose();
    return {
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      user: result.data.user,
    };
  }

  async createClub(
    clubData: {
      name: string;
      description: string;
      category: string;
      contact_email: string;
      manager_user_id?: string;
      manager_full_name?: string;
      manager_email?: string;
    },
    authTokens: AuthTokens
  ): Promise<any> {
    const api = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'x-api-gateway-secret': this.gatewaySecret,
        'Authorization': `Bearer ${authTokens.accessToken}`,
        // Ensure downstream services receive identity even if Kong doesn't inject
        'x-user-id': authTokens.user.id,
        'x-user-role': authTokens.user.role,
        'x-user-email': authTokens.user.email,
        'Content-Type': 'application/json',
      },
    });

    const payload = {
      ...clubData,
      manager_user_id: clubData.manager_user_id || authTokens.user.id,
      manager_full_name: clubData.manager_full_name || authTokens.user.full_name,
      manager_email: clubData.manager_email || authTokens.user.email,
    };

    const response = await api.post('/api/clubs', { data: payload });
    
    if (!response.ok()) {
      const error = await response.json();
      throw new Error(`Club creation failed: ${error.message}`);
    }
    
    const result = await response.json();
    await api.dispose();
    // Support multiple response shapes
    return (result?.data?.event) ?? result?.data ?? result;
  }

  async createEvent(
    eventData: {
      club_id: string;
      title: string;
      description: string;
      category: string;
      start_date: string;
      end_date: string;
      location: string;
      max_participants?: number;
      status?: string;
      visibility?: string;
      detailed_location?: string;
    },
    authTokens: AuthTokens
  ): Promise<any> {
    const api = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'x-api-gateway-secret': this.gatewaySecret,
        'Authorization': `Bearer ${authTokens.accessToken}`,
        // Ensure downstream services receive identity context
        'x-user-id': authTokens.user.id,
        'x-user-role': authTokens.user.role,
        'x-user-email': authTokens.user.email,
        'Content-Type': 'application/json',
      },
    });

    const response = await api.post('/api/events', {
      data: {
        ...eventData,
        status: eventData.status || 'published',
        visibility: eventData.visibility || 'public',
      },
    });
    
    if (!response.ok()) {
      const error = await response.json();
      throw new Error(`Event creation failed: ${error.message}`);
    }
    
    const result = await response.json();
    await api.dispose();
    // Event service returns the event object directly (no wrapper)
    return result?.data ?? result;
  }

  async getClubs(): Promise<any[]> {
    const api = await this.getAPIContext();
    const response = await api.get('/api/clubs');
    
    if (!response.ok()) {
      throw new Error('Failed to fetch clubs');
    }
    
    const result = await response.json();
    return result.data;
  }

  async getEvents(): Promise<any[]> {
    const api = await this.getAPIContext();
    const response = await api.get('/api/events');
    
    if (!response.ok()) {
      throw new Error('Failed to fetch events');
    }
    
    const result = await response.json();
    return result.data;
  }

  async deleteClub(clubId: string, authTokens: AuthTokens): Promise<void> {
    const api = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'x-api-gateway-secret': this.gatewaySecret,
        'x-user-id': authTokens.user.id,
        'x-user-role': authTokens.user.role,
        'Content-Type': 'application/json',
      },
    });

    const response = await api.delete(`/api/clubs/${clubId}`);
    const status = response.status();
    await api.dispose();
    if (status >= 400) {
      throw new Error(`Club deletion failed: HTTP ${status}`);
    }
  }

  async deleteEvent(eventId: string, authTokens: AuthTokens): Promise<void> {
    const api = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'x-api-gateway-secret': this.gatewaySecret,
        'x-user-id': authTokens.user.id,
        'x-user-role': authTokens.user.role,
        'Content-Type': 'application/json',
      },
    });

    const response = await api.delete(`/api/events/${eventId}`);
    const status = response.status();
    await api.dispose();
    if (status >= 400) {
      throw new Error(`Event deletion failed: HTTP ${status}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.apiContext) {
      await this.apiContext.dispose();
      this.apiContext = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
