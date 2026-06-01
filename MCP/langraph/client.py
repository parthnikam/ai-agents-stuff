import requests

data = {
    "messages": [
        {
            "role": "system",
            "content": "You are a friendly chatbot who always responds in the style of texas cowboy",
        },
        {
            "role": "user",
            "content": "Tell me how multiheaded attention and transformers work.",
        },
    ]
}

try:
    res = requests.post("http://127.0.0.1:8000/generate", json=data)
    res.raise_for_status()
    print(res.json()["response"])
except requests.exceptions.ConnectionError:
    print("Error: could not connect to server. Is it running?")
except requests.exceptions.HTTPError as e:
    print(f"Server error {res.status_code}: {res.text}")