# Blurit SDK

The official Node.js SDK for the [Blurit API](https://blurit.io/api).

## Description

This library provides a convenient way to interact with the Blurit REST API for anonymizing images and videos.

## Requirements

- You must already have a Blurit account. If you don't have any, pleae [subscribe here](https://blurit.io/pricing)
- You will need your Client ID and Secret ID. You can find them [here](https://app.blurit.io/account/developer)

## Using the API

Please read carefully the [API documentation](https://doc-api.blurit.io/) as it explains how the API works, especially [this page](https://doc-api.blurit.io/using-the-api).

TL;DR<br>
We **greatly discourage** using the Pull Mode to get the status of an anonymization job. Use the Push Mode with a webhook instead.

When using the pull mode, you will have to periodically call the job status route to get the status of a job until it's successful or failed. This is bad for multiple reasons:

- If you set a very short interval, we might consider you're spamming and send you a `429 Too Many Requests` error
- If you set a long interval, you might wait for too long to get the result
- If you have a flaw in your code, you might call the job status route indefinitely

If you really cannot use webhooks, for example if you use the SDK from an SPA with no backend, then we suggest to adjust the polling interval depending on the media you send:

- Images normally take 2 to 3 secondes to process, so an interval of 500ms should be enough
- Videos may take much longer depending on their resolution and duration, so an interval of 30s to 1min should be enough (even more for long/high res videos)

## Installation

You can install the package using your favorite package manager:

```bash
# Using npm
npm install blurit-sdk

# Using yarn
yarn add blurit-sdk

# Using pnpm
pnpm i blurit-sdk

# Using bun
bun i blurit-sdk
```

## Usage

### Initializing the SDK

The Blurit SDK uses [Axios](https://axios-http.com/) under the hood the make the HTTP calls.
When instancing the SDK, you can pass an optional [argument](https://axios-http.com/docs/req_config) to configure Axios for your specific needs.

```typescript
const blurit = new Blurit();
// or
const blurit = new Blurit({
  proxy: {
    protocol: "http",
    host: "1.2.3.4",
    port: "80",
  },
});
```

### Login

[https://doc-api.blurit.io/using-the-api/api-calls#post-login](https://doc-api.blurit.io/using-the-api/api-calls#post-login)

```typescript
const loginData = await blurit.login("YOUR_CLIENT_ID", "YOUR_SECRET_ID");
console.log(loginData);
//{
//  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
//  "refreshToken": "rt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
//  "expireTime": 3600
//}
```

Returning the login data is optional but recommended as it contains the access token expiration time (`expireTime`). The lifetime of the token is always 1 hour but this may change in the future, that's why it's recommendend to use `expireTime` to known when to call the refresh route.

### Refresh token

[https://doc-api.blurit.io/using-the-api/api-calls#post-token](https://doc-api.blurit.io/using-the-api/api-calls#post-token)

```typescript
const loginData = await blurit.refresh();
console.log(loginData);
//{
//  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
//  "refreshToken": "rt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
//  "expireTime": 3600
//}
```

### Create an anonymization job

[https://doc-api.blurit.io/using-the-api/api-calls#post-innovation-service-anonymization](https://doc-api.blurit.io/using-the-api/api-calls#post-innovation-service-anonymization)

```typescript
const filename = "./image.jpg";
const data = await blurit.createJob(filename, {
  activation_faces_blur: true,
});
console.log(data);
// {
//   "anonymization_job_id": "client_uuid-SRV_ANONYMIZATION-abc123def456"
// }
```

If you want to customize the anonymization style, you can pass an optional `AnonymizationOptions` argument like this:

```typescript
const filename = './image.jpg';
const data = await blurit.createJob(filename, {
  activation_faces_blur: true,
  blur_type: {
    anonymization_type: 'pixelate',
    num_pixels: 10
  }
console.log(data);
});
// {
//   "anonymization_job_id": "client_uuid-SRV_ANONYMIZATION-abc123def456"
// }
```

Please refer to the documentation for all possible parameters and values.

### Get a job status (Pull mode)

[https://doc-api.blurit.io/using-the-api/api-calls#get-innovation-service-anonymization](https://doc-api.blurit.io/using-the-api/api-calls#get-innovation-service-anonymization)

```typescript
const jobStatus = await blurit.getJobStatus(job.anonymization_job_id);
console.log(jobStatus);
// {
//   "status": "Succeeded",
//   "output_media": "https://api.services.wassa.io/innovation-service/result/b83603c4-b9c7-4e86-9fe4-a2eeba2dfa06.jpeg",
//   "output_json": "https://api.services.wassa.io/innovation-service/result/b83603c4-b9c7-4e86-9fe4-a2eeba2dfa06.json",
//   "error": "Error message"
// }
```

### Get result file

[https://doc-api.blurit.io/using-the-api/api-calls#get-innovation-service-result-filename](https://doc-api.blurit.io/using-the-api/api-calls#get-innovation-service-result-filename)

You can get the anonymized file as a `Stream` (default), `ArrayBuffer` or `Blob`. Be careful with the last two options
when manipulating big files as the data will be stored in memory.

```typescript
const filename = jobStatus.output_media!.split("/").pop()!; // jobStatus comes is the result of `blurit.getJobStatus()`
const responseData = await blurit.getResultFile(filename); // optional second argument can be `'stream'` (default), `'arraybuffer'` or `'blob'`
const anonymizedFilePath = "./test/face_anonymized.jpg";

responseData.pipe(fs.createWriteStream(anonymizedFilePath));
responseData.on("end", () => {
  console.log("Anonymized file saved!");
});
```

## API Reference

### `new Blurit(fetchInit?: AxiosRequestConfig)`

Creates a new instance of the `Blurit` client.

- `fetchInit` (optional): Axios request configuration that will be passed to every request.

### `async login(clientId: string, secretId: string): Promise<LoginResponse>`

Authenticates the client and retrieves an access token.

```typescript
type LoginResponse = {
  token: string;
  refreshToken: string;
  expireTime: number;
};
```

### `async refresh(): Promise<RefreshResponse>`

Refreshes the access token using the refresh token.

```typescript
type RefreshResponse = LoginResponse;
```

### `async createJob(file: string, name: string, mimeType: string, options?: AnonymizationOptions): Promise<CreateJobResponse>`

Creates a new anonymization job.

- `file`: Path to the file to anonymize.
- `name`: The name of the file.
- `mimeType`: The MIME type of the file.
- `options` (optional): Anonymization options. See `AnonymizationOptions` type.

```typescript
type AnonymizationOptions = {
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

type CreateJobResponse = {
  anonymization_job_id: string;
};
```

### `async getJobStatus(jobId: string): Promise<GetJobStatusResponse>`

Retrieves the status of an anonymization job.

```typescript
type GetJobStatusResponse = {
  status: JobStatus;
  output_media?: string;
  output_json?: string;
  error?: string;
};

type JobStatus = "Sent" | "Started" | "Succeeded" | "Failed" | "Unknown job" | "Revoked";
```

### `async getResultFile(filename: string): Promise<Stream|ArrayBuffer|Blob>`

Downloads the result file of a completed job. The result is returned either as a `Stream`, an `ArrayBuffer` or a `Blob`.

### `async saveResultFile(filename: string, outputFilename: string): Promise<Stream|ArrayBuffer|Blob>`

Convenient function to save the result file of an anonymization job.

### Webhooks

The SDK also provides methods to manage webhooks for receiving job status updates automatically.

- `async getWebhooks(): Promise<GetWebhooksResponse>`
- `async createWebhook(webhookUrl: string): Promise<CreateWebhookResponse>`
- `async updateWebhook(id: string, webhookUrl:string): Promise<UpdateWebhookResponse>`
- `async deleteWebhook(id: string): Promise<void>`
- `async testWebhook(id: string): Promise<void>`

## Types

The library exports all the necessary types for requests and responses, such as `LoginResponse`, `AnonymizationOptions`, `GetJobStatusResponse`, etc.

## Development

This project uses `tsup` for bundling and `vitest` for testing.

Available scripts:

- `pnpm build`: Build the project for production.
- `pnpm dev`: Watch for changes and rebuild.
- `pnpm test`: Run tests.
- `pnpm lint`: Lint the codebase.
- `pnpm format`: Format the code with Prettier.
