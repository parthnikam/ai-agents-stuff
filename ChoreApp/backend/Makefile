install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --port 8000

test:
	pytest tests/ -v

vapid:
	python -c "from py_vapid import Vapid; v = Vapid(); v.generate_keys(); print('Public:', v.public_key); print('Private:', v.private_key)"
