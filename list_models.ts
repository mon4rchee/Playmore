import axios from "axios";

async function run() {
  const NVIDIA_API_KEY = "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";
  const res = await axios.get("https://integrate.api.nvidia.com/v1/models", {
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`
    }
  });
  const mistralModels = res.data.data.filter((m: any) => m.id.toLowerCase().includes("mistral"));
  console.log(mistralModels.map((m: any) => m.id));
}
run();
