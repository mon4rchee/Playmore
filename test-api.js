import axios from 'axios';

const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

const headers = {
  "Authorization": "Bearer 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",
  "Accept": "application/json",
  "Content-Type": "application/json"
};

const payload = {
  "model": "minimaxai/minimax-m2.7",
  "messages": [{"role":"user","content":"hello"}],
  "max_tokens": 512,
  "temperature": 0.20,
  "top_p": 0.70
};

axios.post(invokeUrl, payload, { headers })
  .then(response => {
    console.log("Success:", JSON.stringify(response.data));
  })
  .catch(error => {
    console.error("Error:", error.response ? error.response.data : error.message);
  });
