import axios, { type AxiosRequestConfig } from "axios";
import { fileTypeFromBuffer } from "file-type";

declare const window: any;

export class Blurit {
  private loginData: LoginResponse = {} as LoginResponse;
  private axiosInstance;
  private readonly isNode: boolean;

  constructor(private readonly fetchInit?: AxiosRequestConfig) {
    this.axiosInstance = axios.create({
      baseURL: "https://api.services.wassa.io",
    });
    this.isNode = typeof window === "undefined";
  }

  async login(clientId: string, secretId: string) {
    const data = await this.request<LoginResponse>("/login", {
      method: "POST",
      data: { clientId, secretId },
      noBearer: true,
    });
    if (!(data instanceof Error)) {
      this.saveLoginData(data);
    }
    return data;
  }

  async refresh() {
    const data = await this.request<RefreshResponse>("/token", {
      method: "POST",
      data: { refreshToken: this.loginData.refreshToken },
    });
    if (!(data instanceof Error)) {
      this.saveLoginData(data);
    }
    return data;
  }

  async createJobFromBuffer(buffer: ArrayBufferLike, filename: string, options?: AnonymizationOptions) {
    const type = await fileTypeFromBuffer(buffer);
    const fileBlob = new Blob([buffer], { type: type?.mime });
    return this.createJob({ data: fileBlob, filename, options });
  }

  async createJobFromFile(file: File, options?: AnonymizationOptions) {
    return this.createJob({ data: file, options });
  }

  async createJobFromBlob(blob: Blob, filename: string, options?: AnonymizationOptions) {
    return this.createJob({ data: blob, filename, options });
  }

  private async createJob(args: { data: File | Blob; filename?: string; options?: AnonymizationOptions }) {
    const data = new FormData();
    data.append("input_media", args.data, args.data instanceof File ? args.data.name : args.filename);
    if (args.options) {
      this.appendFormData(data, args.options);
    }
    return this.request<CreateJobResponse>("/innovation-service/anonymization", {
      method: "POST",
      data,
    });
  }

  async getJobStatus(jobId: string) {
    return await this.request<GetJobStatusResponse>(`/innovation-service/anonymization?anonymization_job_id=${jobId}`, {
      method: "GET",
    });
  }

  async getResultFile<T extends "stream" | "arraybuffer" | "buffer" | "blob" = "stream">(
    filename: string,
    responseType: T
  ) {
    type ResultType = T extends "stream"
      ? any
      : T extends "arraybuffer"
        ? ArrayBuffer
        : T extends "buffer"
          ? Buffer
          : Blob;
    if (!this.isNode && (responseType === "buffer" || responseType === "stream")) {
      throw new Error(`${responseType} is not supported in the browser`);
    }
    return await this.request<ResultType>(`/innovation-service/result/${filename}`, {
      method: "GET",
      responseType: responseType == "buffer" ? "arraybuffer" : responseType,
    });
  }

  async getWebhooks() {
    return await this.request<GetWebhooksResponse>("/webhook-url/get-many", {
      method: "GET",
    });
  }

  async createWebhook(webhookUrl: string) {
    return await this.request<CreateWebhookResponse>("/webhook-url", {
      method: "POST",
      data: { webhookUrl },
    });
  }

  async updateWebhook(id: string, webhookUrl: string) {
    return await this.request<UpdateWebhookResponse>(`/webhook-url/${id}`, {
      method: "PUT",
      data: { webhookUrl },
    });
  }

  async deleteWebhook(id: string) {
    return await this.request(`/webhook-url/${id}`, {
      method: "DELETE",
    });
  }

  async testWebhook(id: string) {
    return await this.request(`/webhook-url/test/${id}`, {
      method: "POST",
    });
  }

  private appendFormData(formData: FormData, data: any, parentKey?: string) {
    if (data && typeof data === "object" && !(data instanceof File || data instanceof Blob)) {
      for (const key in data) {
        if (data[key] !== undefined && data[key] !== null) {
          const newKey = parentKey ? `${parentKey}[${key}]` : key;
          this.appendFormData(formData, data[key], newKey);
        }
      }
    } else if (data !== undefined && data !== null) {
      formData.append(parentKey!, data);
    }
  }

  private async request<T>(path: string, options: RequestOpions) {
    const data = options.data instanceof FormData ? options.data : options.data;
    const headers: Record<string, string> = {
      ...(options.noBearer ? {} : { Authorization: `Bearer ${this.loginData.token}` }),
    };
    const res = await this.axiosInstance.request({
      url: path,
      ...this.fetchInit,
      ...options,
      data,
      headers,
    });
    if (res.status >= 300) {
      throw new Error(`Error calling ${path}: ${res.statusText}`);
    }
    return res.data as T;
  }

  private saveLoginData(data: LoginResponse) {
    this.loginData = data;
  }
}

export type LoginResponse = {
  token: string;
  refreshToken: string;
  expireTime: number;
};

export type RefreshResponse = LoginResponse;

export type CreateJobResponse = {
  anonymization_job_id: string;
};

export type JobStatus = "Sent" | "Started" | "Succeeded" | "Failed" | "Unknown job" | "Revoked";

export type GetJobStatusResponse = {
  status: JobStatus;
  output_media?: string;
  output_json?: string;
  error?: string;
};

export type ArrayBufferOrBuffer = ArrayBuffer | Buffer;

export type GetWebhooksResponse = CreateWebhookResponse[];

export type CreateWebhookResponse = {
  active: boolean;
  webhookToken: string;
  webhookUrl: string;
  uuid: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateWebhookResponse = CreateWebhookResponse;

export type RequestOpions = AxiosRequestConfig & {
  noBearer?: boolean;
};

export type AnonymizationOptions = {
  activation_faces_blur?: boolean;
  activation_plates_blur?: boolean;
  output_detections_url?: boolean;
  included_area?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  blur_type?: {
    anonymization_type?: "blur" | "opaque" | "pixelate";
    smooth_padding?: number;
    hex_color?: string;
    num_pixels?: number;
  };
};
