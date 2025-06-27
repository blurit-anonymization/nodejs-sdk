declare const window: any;

import axios, { type AxiosRequestConfig } from "axios";
import { fileTypeFromBuffer } from "file-type";
import { createWriteStream } from "fs";
import { readFile } from "fs/promises";

/**
 * @description Blurit is the main class for using the Blurit service.
 * @param {AxiosRequestConfig} fetchInit - The fetch initialization options.
 * @returns {Blurit} A Blurit instance.
 */
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

  /**
   * @description Login to the Blurit service.
   * @param {string} clientId - The client ID.
   * @param {string} secretId - The secret ID.
   * @returns {Promise<LoginResponse>} The login data.
   */
  async login(clientId: string, secretId: string) {
    // Make the call
    const data = await this.request<LoginResponse>("/login", {
      method: "POST",
      data: { clientId, secretId },
      noBearer: true,
    });

    // Save the login data if the call was successful
    if (!(data instanceof Error)) {
      this.saveLoginData(data);
    }

    return data;
  }

  /**
   * @description Refresh the access token with the refresh token.
   * @returns {Promise<RefreshResponse>} The login data.
   */
  async refresh() {
    // Make the call
    const data = await this.request<RefreshResponse>("/token", {
      method: "POST",
      data: { refreshToken: this.loginData.refreshToken },
    });

    // Save the login data if the call was successful
    if (!(data instanceof Error)) {
      this.saveLoginData(data);
    }

    return data;
  }

  /**
   * @description Create a new anonymization job.
   * @param {string} filePath - The content of the file.
   * @param {AnonymizationOptions} options - The blur options.
   * @returns {Promise<CreateJobResponse>} The anonymization data.
   * @note Node.js only
   */
  async createJobFromPath(filePath: string, options?: AnonymizationOptions) {
    if (!this.isNode) {
      throw new Error("createJobFromPath is only available in Node.js");
    }
    const fileBuffer = await readFile(filePath);
    const name = filePath.split("/").pop()!;
    return this.createJobFromBuffer(fileBuffer, name, options);
  }

  /**
   * @description Create a new anonymization job from a buffer.
   * @param {ArrayBufferLike} buffer - The Buffer object.
   * @param {string} filename - The name of the file.
   * @param {AnonymizationOptions} options - The blur options.
   * @returns {Promise<CreateJobResponse>} The anonymization data.
   */
  async createJobFromBuffer(buffer: ArrayBufferLike, filename: string, options?: AnonymizationOptions) {
    const type = await fileTypeFromBuffer(buffer);
    const fileBlob = new Blob([buffer], { type: type?.mime });
    return this.createJob({ data: fileBlob, filename, options });
  }

  /**
   * @description Create a new anonymization job from a File object.
   * @param {File} file - The File object.
   * @param {AnonymizationOptions} options - The blur options.
   * @returns {Promise<CreateJobResponse>} The anonymization data.
   */
  async createJobFromFile(file: File, options?: AnonymizationOptions) {
    return this.createJob({ data: file, options });
  }

  /**
   * @description Create a new anonymization job from a Blob object.
   * @param {Blob} blob - The Blob object.
   * @param {string} filename - The name of the file.
   * @param {AnonymizationOptions} options - The blur options.
   * @returns {Promise<CreateJobResponse>} The anonymization data.
   */
  async createJobFromBlob(blob: Blob, filename: string, options?: AnonymizationOptions) {
    return this.createJob({ data: blob, filename, options });
  }

  /**
   * @description Create a new anonymization job from a File or Blob object.
   * @param {File | Blob} data - The File or Blob object.
   * @param {string} filename - The name of the file.
   * @param {AnonymizationOptions} options - The blur options.
   * @returns {Promise<CreateJobResponse>} The anonymization data.
   */
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

  /**
   * @description Get the status of an anonymization job.
   * @param {string} jobId - The ID of the anonymization job.
   * @returns {Promise<GetJobStatusResponse>} The status of the anonymization job.
   */
  async getJobStatus(jobId: string) {
    // Make the call
    return await this.request<GetJobStatusResponse>(`/innovation-service/anonymization?anonymization_job_id=${jobId}`, {
      method: "GET",
    });
  }

  /**
   * @description Get the result file of an anonymization job.
   * @param {string} filename - The name of the file.
   * @param {string} responseType - The type of response.
   * @returns {Promise<ReadStream|ArrayBuffer|Buffer|Blob>} The result file.
   * @note ReadStream ("stream") et Buffer ("buffer") sont Node.js only
   */
  async getResultFile<T extends "stream" | "arraybuffer" | "buffer" | "blob" = "stream">(
    filename: string,
    responseType: T
  ) {
    type ResultType = T extends "stream"
      ? any // ReadStream n'est pas typé dans le navigateur
      : T extends "arraybuffer"
        ? ArrayBuffer
        : T extends "buffer"
          ? Buffer
          : Blob;

    if (!this.isNode && (responseType === "buffer" || responseType === "stream")) {
      throw new Error(`${responseType} is not supported in the browser`);
    }

    // Make the call
    return await this.request<ResultType>(`/innovation-service/result/${filename}`, {
      method: "GET",
      responseType: responseType == "buffer" ? "arraybuffer" : responseType,
    });
  }

  /**
   * @description Convenient function to save the result file of an anonymization job.
   * @param {string} filename - The name of the file.
   * @param {string} outputFilename - The name of the output file.
   * @note Node.js only
   */
  async saveResultFile(filename: string, outputFilename: string) {
    if (!this.isNode) {
      throw new Error("saveResultFile is only available in Node.js");
    }
    const responseData = await this.getResultFile(filename, "stream");
    responseData.pipe(createWriteStream(outputFilename));
  }

  /**
   * @description Get all webhooks.
   * @returns {Promise<GetWebhooksResponse>} The webhooks.
   */
  async getWebhooks() {
    // Make the call
    return await this.request<GetWebhooksResponse>("/webhook-url/get-many", {
      method: "GET",
    });
  }

  /**
   * @description Create a new webhook.
   * @param {string} webhookUrl - The URL of the webhook.
   * @returns {Promise<CreateWebhookResponse>} The webhook.
   */
  async createWebhook(webhookUrl: string) {
    // Make the call
    return await this.request<CreateWebhookResponse>("/webhook-url", {
      method: "POST",
      data: { webhookUrl },
    });
  }

  /**
   * @description Update a webhook.
   * @param {string} id - The ID of the webhook.
   * @param {string} webhookUrl - The URL of the webhook.
   * @returns {Promise<UpdateWebhookResponse>} The webhook.
   */
  async updateWebhook(id: string, webhookUrl: string) {
    // Make the call
    return await this.request<UpdateWebhookResponse>(`/webhook-url/${id}`, {
      method: "PUT",
      data: { webhookUrl },
    });
  }

  /**
   * @description Delete a webhook.
   * @param {string} id - The ID of the webhook.
   * @returns {Promise<void>} The webhook.
   */
  async deleteWebhook(id: string) {
    // Make the call
    return await this.request(`/webhook-url/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * @description Test a webhook.
   * @param {string} id - The ID of the webhook.
   * @returns {Promise<void>} The webhook.
   */
  async testWebhook(id: string) {
    // Make the call
    return await this.request(`/webhook-url/test/${id}`, {
      method: "POST",
    });
  }

  /**
   * @description Recursively append data to a FormData object.
   * @param {FormData} formData - The FormData object to append data to.
   * @param {any} data - The data to append to the FormData object.
   * @param {string} parentKey - The parent key of the data.
   */
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

  /**
   * @description Make a request to the Blurit service using Axios.
   * @param {string} path - The path to the resource.
   * @param {RequestOpions} options - The request options.
   * @returns {Promise<T>} The response data.
   */
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

  /**
   * @description Save the login data to the class instance.
   * @param {LoginResponse} data - The login data to save.
   */
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
