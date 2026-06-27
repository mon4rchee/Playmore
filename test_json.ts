import axios from "axios";

async function run() {
  const NVIDIA_API_KEY = "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";
  const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
  try {
    const res = await axios.post(
      invokeUrl,
      {
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: "You are a helpful assistant. Output JSON." },
          { role: "user", content: "Say hello in JSON." }
        ],
        max_tokens: 100,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      }
    );
    console.log(res.data.choices[0].message.content);
  } catch (error: any) {
    console.error(error.response?.data || error.message);
  }
}
run();
