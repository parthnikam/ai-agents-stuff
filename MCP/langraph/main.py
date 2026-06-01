from transformers import AutoTokenizer, AutoModelForCausalLM
import os
from dotenv import load_dotenv

load_dotenv()
hf_token = os.getenv('HF_TOKEN')

tokenizer = AutoTokenizer.from_pretrained("TinyLlama/TinyLlama-1.1B-Chat-v1.0", token=hf_token)
model = AutoModelForCausalLM.from_pretrained("TinyLlama/TinyLlama-1.1B-Chat-v1.0", token=hf_token)
messages = [
    {
		"role": "user", 
		"content": "can you explain how multiheaded attention and transformers work to a math and programming graduate."
	},
]

inputs = tokenizer.apply_chat_template(
	messages,
	add_generation_prompt=True,
	tokenize=True,
	return_dict=True,
	return_tensors="pt",
).to(model.device)

outputs = model.generate(**inputs, max_new_tokens=500)
print(tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:]))