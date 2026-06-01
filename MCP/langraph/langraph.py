from llama_cpp import Llama

llm = Llama.from_pretrained(
	repo_id="Jackrong/Qwen3.5-9B-GLM5.1-Distill-v1-GGUF",
	filename="Qwen3.5-9B-GLM5.1-Distill-v1-BF16.gguf",
)

llm.create_chat_completion(
	messages = [
		{
			"role": "user",
			"content": "What is the capital of Singapore?"
		}
	]
)