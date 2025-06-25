import { Blurit, GetJobStatusResponse } from "../src/blurit";
import "dotenv/config";

async function run() {
  const blurit = new Blurit();

  await blurit.login(process.env.CLIENT_ID!, process.env.SECRET_ID!);
  console.log("Login OK");

  const filename = "./images/face.jpg";
  const data = await blurit.createJobFromPath(filename, {
    activation_faces_blur: true,
    blur_type: {
      anonymization_type: "pixelate",
      num_pixels: 10,
    },
  });

  console.log("Create job OK");

  let done = false;
  const maxRetries = 10;
  let retries = 0;
  let jobStatus: GetJobStatusResponse;

  do {
    jobStatus = await blurit.getJobStatus(data.anonymization_job_id);
    if (jobStatus.status === "Succeeded") {
      console.log("Job status OK");
      done = true;
    }
    retries++;
    // Wait for 500 ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 500));
  } while (!done && retries < maxRetries);

  if (!done) {
    throw new Error("Job failed");
  }

  await blurit.saveResultFile(jobStatus.output_media!.split("/").pop()!, "./images/face_anonymized.jpg");
  console.log("Save result file OK");
}

run();
