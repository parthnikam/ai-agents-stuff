from fastapi import FastAPI, HTTPException
from typing import List, Literal
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch, os
from dotenv import load_dotenv

load_dotenv()
hf_token = os.getenv("HF_TOKEN")

app = FastAPI()


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class Request(BaseModel):
    messages: List[Message]

tokenizer = AutoTokenizer.from_pretrained("TinyLlama/TinyLlama-1.1B-Chat-v1.0", token=hf_token)
model = AutoModelForCausalLM.from_pretrained("TinyLlama/TinyLlama-1.1B-Chat-v1.0", token=hf_token, device_map="auto")


def format_messages(messages: List[Message]) -> str:
    prompt = ""
    for m in messages:
        # m is a Pydantic object — use attribute access, not dict keys
        if m.role == "system":
            prompt += f"<|system|>\n{m.content}\n"
        elif m.role == "user":
            prompt += f"<|user|>\n{m.content}\n"
        elif m.role == "assistant":
            prompt += f"<|assistant|>\n{m.content}\n"
    prompt += "<|assistant|>\n"
    return prompt


@app.post("/generate")
def generate(req: Request):
    try:
        prompt = format_messages(req.messages)

        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        input_length = inputs["input_ids"].shape[1]

        outputs = model.generate(
            **inputs,
            max_new_tokens=150,
            do_sample=True,
            temperature=0.7,
        )

        # Slice off the prompt tokens so you only decode the new response
        new_tokens = outputs[0][input_length:]
        response = tokenizer.decode(new_tokens, skip_special_tokens=True)

        return {"response": response.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))