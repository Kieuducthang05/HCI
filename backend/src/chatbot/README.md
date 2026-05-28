
## Bước 1 – Build và chạy

```bash
# Build lần đầu (mất ~5-10 phút do tải torch)
docker compose build

# Chạy cả 2 service
docker compose up -d

# Xem log
docker compose logs -f
```

---

## API Endpoints

### Chatbot (port 8080)

#### `GET /health`
Kiểm tra service.

#### `POST /chat`
```json
// Request body
{
  "message": "Hôm nay con vui lắm!",
  "history": [],
  "conversation_summary": ""
}

// Response
{
  "reply": "Bạn thỏ vui khi nghe điều đó! Bé làm gì vui vậy?",
  "conversation_summary": "Bé chia sẻ hôm nay vui...",
  "input_filter": { "status": false, "reason": "...", "severity": "low" },
  "output_filter": { "status": false, "reason": "...", "severity": "low" },
  "output_replaced": false,
  "parent_alert": null
}
```

### Model Server (port 8001)

#### `GET /health`
Kiểm tra service và trạng thái model.

#### `GET /model/info`
Trả về metadata (tên file, dung lượng, nhãn cảm xúc, link tải).

#### `GET /model/download`
**Tải thẳng file .pt về máy.**

```bash
# Ví dụ tải bằng curl
curl -O http://localhost:9000/model/download

# Hoặc trong trình duyệt
http://localhost:8001/model/download
```

#### `POST /model/predict`
Nhận ảnh khuôn mặt, trả về cảm xúc.

```bash
# Ví dụ với curl
curl -X POST http://localhost:9000/model/predict \
  -F "file=@face.jpg"
```

```json
// Response
{
  "emotion": "vui",
  "confidence": 0.9231,
  "all_scores": {
    "vui": 0.9231,
    "buồn": 0.0312,
    "tức giận": 0.0198,
    "sợ hãi": 0.0142,
    "bình thường": 0.0117
  }
}
```

## Xem tài liệu API tự động (Swagger UI)

- Chatbot: http://localhost:8080/docs
- Model server: http://localhost:8001/docs
