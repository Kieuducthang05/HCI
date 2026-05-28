FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

# Cài torch CPU-only từ PyTorch index (nhỏ hơn nhiều so với bản CUDA)
RUN pip install --no-cache-dir \
    torch==2.5.1+cpu \
    torchvision==0.20.1+cpu \
    --extra-index-url https://download.pytorch.org/whl/cpu

WORKDIR /app

COPY requirements.txt .
# Bỏ torch/torchvision khỏi pip install vì đã cài ở trên
RUN grep -vE "^torch" requirements.txt | pip install --no-cache-dir -r /dev/stdin

COPY app/ .

# Thư mục chứa file .pt (mount từ host hoặc COPY vào)
RUN mkdir -p /app/weights

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
