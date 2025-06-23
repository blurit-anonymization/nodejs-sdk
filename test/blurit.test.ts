import {
  GetJobStatusResponse,
  CreateJobResponse,
  Blurit,
  CreateWebhookResponse,
  RefreshResponse,
  LoginResponse,
  GetWebhooksResponse,
  UpdateWebhookResponse,
} from "../src/blurit";
import { test, expect, describe, beforeAll, expectTypeOf } from "vitest";
import "dotenv/config";
import { writeFileSync } from "fs";
import { stat, unlink } from "fs/promises";

describe("Authentication", () => {
  const blurit = new Blurit();
  let loginData: LoginResponse | undefined = undefined;

  test("login", async () => {
    loginData = await login(blurit);
  });

  test("refresh", async ({ skip }) => {
    skip(loginData == undefined);

    loginData = await blurit.refresh();
    expectTypeOf(loginData).toEqualTypeOf<RefreshResponse>();
  });
});

describe("Jobs", () => {
  const blurit = new Blurit();
  let jobId = "";
  const filename = "./images/face.jpg";
  let outputMedia: string | undefined = undefined;

  beforeAll(async () => {
    await login(blurit);
  });

  test("createJob", async () => {
    const data = await blurit.createJob(filename, {
      activation_faces_blur: true,
      blur_type: {
        anonymization_type: "pixelate",
        num_pixels: 10,
      },
    });
    expectTypeOf(data).toEqualTypeOf<CreateJobResponse>();
    jobId = (data as CreateJobResponse).anonymization_job_id;
  });

  test(
    "getJobStatus",
    async ({ skip }) => {
      skip(jobId == "");

      // Wait 500ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 500));

      const data = await blurit.getJobStatus(jobId);
      expectTypeOf(data).toEqualTypeOf<GetJobStatusResponse>();
      expect(data.status).toBe("Succeeded");
      outputMedia = data.output_media;
    },
    { retry: 20 }
  );

  test("getResultFile", async ({ skip }) => {
    skip(outputMedia == undefined);

    const anonymizedFilePath = "./images/face_anonymized.jpg";
    const data = await blurit.getResultFile(outputMedia!.split("/").pop()!, "buffer");
    expect(data).toBeDefined();

    try {
      await unlink(anonymizedFilePath);
    } catch {}

    writeFileSync(anonymizedFilePath, data);
    const stats = await stat(anonymizedFilePath);
    expect(stats).toBeDefined();
  });

  test("createJobAndWait", async () => {
    const data = await blurit.createJobAndWait(filename, 10000);
    expect(data).toBeInstanceOf(Buffer);
  }, 10000);
});

describe("Webhooks", () => {
  const blurit = new Blurit();
  const webhookUrl = "https://webhook.site/webhook-url";
  let webhookId = "";

  beforeAll(async () => {
    await login(blurit);
  });

  test("createWebhook", async () => {
    const webhook = await blurit.createWebhook(webhookUrl);
    expectTypeOf(webhook).toEqualTypeOf<CreateWebhookResponse>();
    expect(webhook.webhookUrl).toBe(webhookUrl);
    webhookId = webhook.uuid;
  });

  test("getWebhooks", async ({ skip }) => {
    skip(webhookId == "");

    const webhooks = await blurit.getWebhooks();
    expectTypeOf(webhooks).toEqualTypeOf<GetWebhooksResponse>();
    expect(webhooks).toEqual(expect.arrayContaining([expect.objectContaining({ webhookUrl })]));
  });

  test("updateWebhook", async ({ skip }) => {
    skip(webhookId == "");

    const webhookUrl2 = `${webhookUrl}-2`;
    const webhook = await blurit.updateWebhook(webhookId, webhookUrl2);
    console.log("webhook", webhook);
    expectTypeOf(webhook).toEqualTypeOf<UpdateWebhookResponse>();
    expect(webhook.webhookUrl).toBe(webhookUrl2);
  });

  test("deleteWebhook", async () => {
    // It's safer to delete all webhooks to avoid having remaining "zombie" webhooks
    let webhooks = await blurit.getWebhooks();

    for (const webhook of webhooks) {
      await blurit.deleteWebhook(webhook.uuid);
    }

    webhooks = await blurit.getWebhooks();
    expect(webhooks.length).toBe(0);
  });
});

async function login(blurit: Blurit) {
  const loginData = await blurit.login(process.env.CLIENT_ID!, process.env.SECRET_ID!);
  expectTypeOf(loginData).toEqualTypeOf<LoginResponse>();

  return loginData;
}
