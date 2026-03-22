import { Config } from './config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
  timeout?: number;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly response?: unknown;
  public url: string;
  public method: string;

  constructor(
    message: string,
    status: number,
    statusText: string,
    response?: unknown,
    url: string = '',
    method: string = ''
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.url = url;
    this.method = method;
  }

  public isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  public isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  public isNetworkError(): boolean {
    return this.status === 0;
  }
}

export type RequestInterceptor = (
  url: string,
  options: RequestInit
) => RequestInit | Promise<RequestInit>;

export type ResponseInterceptor = (
  response: Response,
  data: unknown
) => unknown | Promise<unknown>;

export type ErrorInterceptor = (
  error: ApiError
) => ApiError | Promise<ApiError>;

export interface ApiClientConfig {
  baseURL?: string;
  basePath?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptors?: ErrorInterceptor[];
}

export class ApiClient {
  private baseURL?: string;
  private basePath?: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  private errorInterceptors: ErrorInterceptor[];

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || undefined;
    this.basePath = config.basePath || undefined;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
    this.timeout = config.timeout || 30000;
    this.requestInterceptors = config.requestInterceptors || [];
    this.responseInterceptors = config.responseInterceptors || [];
    this.errorInterceptors = config.errorInterceptors || [];
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const baseURL = this.baseURL || Config.baseURL;
    const basePath = this.basePath || Config.basePath;
    const url = new URL(`${basePath[0] !== '/' ? '/' : ''}${basePath}${endpoint}`, baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      ...this.defaultHeaders,
      ...customHeaders,
    };
  }

  private async applyRequestInterceptors(
    url: string,
    options: RequestInit
  ): Promise<RequestInit> {
    let processedOptions = options;

    for (const interceptor of this.requestInterceptors) {
      processedOptions = await interceptor(url, processedOptions);
    }

    return processedOptions;
  }

  private async applyResponseInterceptors(
    response: Response,
    data: unknown
  ): Promise<unknown> {
    let processedData = data;

    for (const interceptor of this.responseInterceptors) {
      processedData = await interceptor(response, processedData);
    }

    return processedData;
  }

  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let processedError = error;

    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }

    return processedError;
  }

  private createAbortController(timeout?: number): AbortController | undefined {
    if (timeout === undefined && this.timeout === 0) {
      return undefined;
    }

    const controller = new AbortController();
    const timeoutMs = timeout ?? this.timeout;

    setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return controller;
  }

  private async handleResponse<T>(response: Response, url: string, method: HttpMethod): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: unknown;

    if (isJson) {
      data = await response.json();
    } else if (response.status !== 204) {
      data = await response.text();
    }

    const processedData = await this.applyResponseInterceptors(response, data);

    if (!response.ok) {
      throw new ApiError(
        `HTTP error! status: ${response.status}`,
        response.status,
        response.statusText,
        processedData,
        url,
        method
      );
    }

    return processedData as T;
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const headers = this.buildHeaders(options.headers);

    let requestOptions: RequestInit = {
      method,
      headers,
      signal: options.signal || this.createAbortController(options.timeout)?.signal,
    };

    if (body !== undefined && body !== null) {
      if (body instanceof FormData) {
        delete (requestOptions.headers as Record<string, string>)['Content-Type'];
        requestOptions.body = body;
      } else if (typeof body === 'string') {
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }

    requestOptions = await this.applyRequestInterceptors(url, requestOptions);

    try {
      const response = await fetch(url, requestOptions);
      return await this.handleResponse<T>(response, url, method);
    } catch (error) {
      if (error instanceof ApiError) {
        if (!error.url) error.url = url;
        if (!error.method) error.method = method;
        throw await this.applyErrorInterceptors(error);
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const abortError = new ApiError(
            'Request timeout',
            0,
            'Timeout',
            { message: 'The request timed out' },
            url,
            method
          );
          throw await this.applyErrorInterceptors(abortError);
        }

        const networkError = new ApiError(
          error.message,
          0,
          'Network Error',
          { message: error.message },
          url,
          method
        );
        throw await this.applyErrorInterceptors(networkError);
      }

      const unknownError = new ApiError(
        'An unknown error occurred',
        0,
        'Unknown Error',
        { error },
        url,
        method
      );
      throw await this.applyErrorInterceptors(unknownError);
    }
  }

  public async get<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  public async post<T>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  public async put<T>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  public async patch<T>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  public async delete<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  public setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  public removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  public setAuthToken(token: string, type: 'Bearer' | 'Basic' = 'Bearer'): void {
    this.setHeader('Authorization', `${type} ${token}`);
  }

  public clearAuthToken(): void {
    this.removeHeader('Authorization');
  }

  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  public addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }
}
