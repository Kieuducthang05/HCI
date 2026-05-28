import json
import os
import random
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

# ─── Config ───────────────────────────────────────────────────────────────────

API_KEY = os.environ.get("GROQ_API_KEY", "")
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"

CHILD_PROFILE = {
    "name": os.environ.get("CHILD_NAME", "Minh"),
    "age": int(os.environ.get("CHILD_AGE", "8")),
    "interests": os.environ.get("CHILD_INTERESTS", "khủng long,tàu hỏa,màu xanh").split(","),
    "communication_level": os.environ.get("CHILD_COMM_LEVEL", "cơ bản"),
}

COMPANION_PROFILE = {
    "name": "Bạn thỏ",
    "personality": (
        "Bạn thỏ là người bạn thân thiện, kiên nhẫn, nói chuyện chậm rãi và rõ ràng. "
        "Bạn thỏ dùng câu ngắn, từ ngữ đơn giản. "
        "Bạn thỏ luôn vui vẻ, không bao giờ phán xét và khuyến khích trẻ."
    ),
}

LLM1_MODEL = os.environ.get("LLM1_MODEL", "llama-3.1-8b-instant")
LLM2_MODEL = os.environ.get("LLM2_MODEL", "llama-3.1-8b-instant")
MAX_HISTORY_TURNS = 5

# ─── Prompts ──────────────────────────────────────────────────────────────────

INPUT_FILTER_SYSTEM_PROMPT = """Bạn là bộ lọc cảm xúc cho câu nói của trẻ trong ứng dụng chatbot dành cho trẻ tự kỷ.
Nhiệm vụ của bạn là phát hiện khi trẻ có dấu hiệu cảm xúc tiêu cực hoặc rủi ro cần phụ huynh chú ý.

Trả về đúng JSON, không thêm nội dung khác:

{
  "status": true hoặc false,
  "reason": "giải thích ngắn gọn bằng tiếng Việt",
  "severity": "low" | "medium" | "high"
}

"status": true (Chặn câu trả lời đến với trẻ) chỉ khi câu nói của trẻ có dấu hiệu như:
- Buồn, khóc, cô đơn, bị bỏ rơi, thất vọng, xấu hổ
- Lo lắng, sợ hãi, hoảng, quá tải cảm xúc
- Tức giận mạnh, kích động, muốn đập phá
- Bị bắt nạt, bị đe dọa, bị đau, không an toàn
- Muốn làm đau bản thân hoặc người khác

"severity":
- "low": cảm xúc tiêu cực nhẹ, cần ghi nhận
- "medium": cảm xúc rõ ràng, trẻ đang khó chịu hoặc bất an
- "high": nguy cơ an toàn, tự làm đau, làm đau người khác, bị hại.

"status": false nếu câu nói chỉ là câu hỏi bình thường, kể chuyện, chơi đùa, hỏi về chủ đề đáng sợ theo kiểu tò mò, hoặc nội dung an toàn."""

OUTPUT_FILTER_SYSTEM_PROMPT = """Bạn là bộ lọc an toàn cho câu trả lời của chatbot dành cho trẻ tự kỷ.
Nhiệm vụ của bạn là chỉ phát hiện khi câu trả lời của chatbot có thể gây hại trực tiếp cho trẻ.

Trả về đúng JSON, không thêm nội dung khác:

{
  "status": true hoặc false,
  "reason": "giải thích ngắn gọn bằng tiếng Việt",
  "severity": "low" | "medium" | "high"
}

"status": true chỉ khi câu trả lời của chatbot có một trong các lỗi nghiêm trọng sau:
- Khuyên, hướng dẫn, cổ vũ trẻ làm đau bản thân hoặc người khác
- Hướng dẫn bạo lực, nguy hiểm, dùng vật sắc nhọn, thuốc, hóa chất, lửa, điện hoặc hành vi rủi ro
- Dọa nạt, xúc phạm, làm trẻ thấy tội lỗi, xấu hổ hoặc vô dụng
- Khuyến khích trẻ che giấu nguy hiểm với người lớn đáng tin cậy
- Nội dung người lớn hoặc tình dục

"status": false nếu câu trả lời đang an ủi, trấn an, đồng cảm, hướng trẻ tìm người lớn đáng tin cậy, đổi sang chủ đề an toàn."""

SUMMARY_SYSTEM_PROMPT = """Bạn tóm tắt cuộc hội thoại giữa một chatbot tên Bạn thỏ và một trẻ tự kỷ.
Tóm tắt phải:
- Ngắn gọn, tối đa 100 từ
- Ghi lại các chủ đề đã nói, cảm xúc của trẻ, điều trẻ quan tâm
- Viết bằng tiếng Việt
- Dùng để làm ngữ cảnh cho câu hỏi tiếp theo

Chỉ trả về đoạn tóm tắt, không thêm tiêu đề hay giải thích."""

SAFE_FALLBACK_RESPONSES = [
    "Thỏ không chắc về điều đó. Bé thích nói về khủng long không?",
    "Thỏ muốn hỏi bé hôm nay có vui không?",
    "Bé giỏi lắm. Mình nói về chủ đề khác nhé?",
    "Thỏ quý bé lắm. Hôm nay bé làm gì vui không?",
]

# ─── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Chatbot Hỗ Trợ Trẻ Tự Kỷ",
    description="API cho chatbot Bạn thỏ – hỗ trợ trẻ tự kỷ nhận biết cảm xúc",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models ───────────────────────────────────────────────────────────

class Turn(BaseModel):
    user: str
    assistant: str

class ChatRequest(BaseModel):
    message: str
    history: list[Turn] = []
    conversation_summary: str = ""

class FilterResult(BaseModel):
    status: bool
    reason: str
    severity: str

class ChatResponse(BaseModel):
    reply: str
    conversation_summary: str
    input_filter: FilterResult
    output_filter: FilterResult
    output_replaced: bool
    parent_alert: Optional[dict] = None

# ─── Core logic ───────────────────────────────────────────────────────────────

def get_client() -> Groq:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY chưa được cấu hình.")
    return Groq(api_key=API_KEY)


def llm1_filter(client: Groq, text: str, context: str = "input") -> dict:
    target = "câu hỏi của trẻ" if context == "input" else "câu trả lời của chatbot"
    system_prompt = INPUT_FILTER_SYSTEM_PROMPT if context == "input" else OUTPUT_FILTER_SYSTEM_PROMPT
    try:
        response = client.chat.completions.create(
            model=LLM1_MODEL,
            max_tokens=200,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Hãy phân tích {target} sau:\n\n{text}"},
            ],
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception:
        return {"status": False, "reason": "Không phân tích được", "severity": "low"}


def build_chat_system_prompt(conversation_summary: str) -> str:
    child = CHILD_PROFILE
    companion = COMPANION_PROFILE
    return f"""Bạn là {companion['name']}, {companion['personality']}, là một trợ lý AI của ứng dụng hỗ trợ trẻ tự kỷ nhận biết cảm xúc.

THÔNG TIN VỀ BÉ:
- Tên: {child['name']}
- Tuổi: {child['age']}
- Sở thích: {', '.join(child['interests'])}
- Mức độ giao tiếp: {child['communication_level']}

HƯỚNG DẪN GIAO TIẾP:
- Dùng câu ngắn, tối đa 2-3 câu mỗi lượt
- Từ ngữ đơn giản, dễ hiểu
- Khen ngợi và động viên thường xuyên
- Kiên nhẫn, không vội vàng
- Khuyến khích trẻ giao tiếp và chia sẻ với gia đình

TÓM TẮT CUỘC HỘI THOẠI TRƯỚC:
{conversation_summary if conversation_summary else "Đây là cuộc hội thoại đầu tiên."}"""


def llm2_chat(client: Groq, user_message: str, history: list[Turn], conversation_summary: str) -> str:
    messages = [{"role": "system", "content": build_chat_system_prompt(conversation_summary)}]
    for turn in history[-MAX_HISTORY_TURNS:]:
        messages.append({"role": "user", "content": turn.user})
        messages.append({"role": "assistant", "content": turn.assistant})
    messages.append({"role": "user", "content": user_message})
    try:
        response = client.chat.completions.create(
            model=LLM2_MODEL, max_tokens=180, temperature=0.6, messages=messages
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return "Mình không hiểu lắm. Bé có thể nói lại không?"


def llm2_summarize(client: Groq, history: list[Turn], old_summary: str) -> str:
    if not history:
        return ""
    history_text = "".join(
        f"Bé: {t.user}\nBạn thỏ: {t.assistant}\n\n" for t in history[-MAX_HISTORY_TURNS:]
    )
    try:
        response = client.chat.completions.create(
            model=LLM2_MODEL,
            max_tokens=150,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": f"Tóm tắt cũ:\n{old_summary}\n\nCuộc hội thoại mới:\n{history_text}"},
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return old_summary

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "companion": COMPANION_PROFILE["name"], "child": CHILD_PROFILE["name"]}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    client = get_client()
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    # 1. Filter input
    input_filter = llm1_filter(client, req.message, context="input")

    parent_alert = None
    if input_filter.get("status"):
        parent_alert = {
            "timestamp": timestamp,
            "child_message": req.message,
            "reason": input_filter.get("reason"),
            "severity": input_filter.get("severity"),
        }

    # 2. Generate reply
    reply = llm2_chat(client, req.message, req.history, req.conversation_summary)

    # 3. Filter output
    output_filter = llm1_filter(client, reply, context="output")
    output_replaced = False
    if output_filter.get("status"):
        reply = random.choice(SAFE_FALLBACK_RESPONSES)
        output_replaced = True

    # 4. Update summary
    new_history = list(req.history) + [Turn(user=req.message, assistant=reply)]
    new_summary = llm2_summarize(client, new_history, req.conversation_summary)

    return ChatResponse(
        reply=reply,
        conversation_summary=new_summary,
        input_filter=FilterResult(**{k: input_filter.get(k, v) for k, v in {"status": False, "reason": "", "severity": "low"}.items()}),
        output_filter=FilterResult(**{k: output_filter.get(k, v) for k, v in {"status": False, "reason": "", "severity": "low"}.items()}),
        output_replaced=output_replaced,
        parent_alert=parent_alert,
    )
