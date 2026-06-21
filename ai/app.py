import os
import re
import json
import requests
from flask import Flask, request, jsonify, Response, stream_with_context

app = Flask(__name__)

# Shared secret: when AI_API_KEY is set (in prod), every request must send it.
# Local dev leaves it unset, so nothing changes.
API_KEY = os.environ.get("AI_API_KEY")


@app.before_request
def require_api_key():
    if API_KEY and request.headers.get("X-API-Key") != API_KEY:
        return jsonify({"error": "unauthorized"}), 401


# ponytail: voice/TTS removed — text-only. Re-add XTTS here if voice comes back.
LLAMA_SERVER_URL = "http://localhost:8080/completion"

def call_llama(prompt: str, stop: list[str] = ["<|im_end|>", "User:", "You:", "\nUser:", "\nYou:", "Assistant:"]) -> str:
    payload = {
        "prompt": prompt,
        "n_predict": 180,
        "temperature": 0.95,
        "stop": stop,
        "top_p": 0.95,
        "repeat_penalty": 1.15,
    }
    try:
        response = requests.post(LLAMA_SERVER_URL, json=payload)
        response.raise_for_status()
        return response.json().get("content", "").strip()
    except Exception as e:
        print(f"Llama-server error: {e}")
        return "Error: AI engine is currently unavailable."

def clean_reply(text: str, character_name: str) -> str:
    text = re.sub(rf"^{character_name}:\s*", "", text, flags=re.IGNORECASE)
    # Stop at any point the model starts a new turn / second speaker.
    cleaned = re.split(r"\n(User|AI|Assistant|System):", text, flags=re.IGNORECASE)[0]
    cleaned = cleaned.replace("<|im_end|>", "").replace("<|im_start|>", "")

    # ponytail: MythoMax ignores the ChatML stop and narrates both sides.
    # A real reply is narration + the character's OWN dialogue. The runaway
    # only starts when a SECOND speaker talks, so cut at the 2nd quoted line
    # (3rd quote mark) — this keeps narration before AND after the one line.
    quotes = [i for i, ch in enumerate(cleaned) if ch in '"“”']
    if len(quotes) >= 3:
        cleaned = cleaned[: quotes[2]]
        # drop a dangling attribution fragment left before the cut quote
        tail = max(cleaned.rfind("."), cleaned.rfind("*"), cleaned.rfind('"'), cleaned.rfind("”"))
        if tail != -1:
            cleaned = cleaned[: tail + 1]
    else:
        # No second speaker — just trim to the last complete sentence/quote.
        tail = max(cleaned.rfind("."), cleaned.rfind('"'), cleaned.rfind("”"), cleaned.rfind("*"))
        if tail != -1:
            cleaned = cleaned[: tail + 1]

    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json
    prompt = data.get("prompt")
    character_name = data.get("character_name", "Assistant")
    raw_reply = call_llama(prompt)
    reply = clean_reply(raw_reply, character_name)
    return jsonify({"reply": reply})

def _second_speaker_cut(text):
    # Index where a 2nd speaker's dialogue starts (the 3rd quote mark), else None.
    q = [i for i, c in enumerate(text) if c in '"“”']
    return q[2] if len(q) >= 3 else None

@app.route("/generate-stream", methods=["POST"])
def generate_stream():
    data = request.json
    prompt = data.get("prompt")

    @stream_with_context
    def gen():
        acc = ""
        sent = 0
        payload = {
            "prompt": prompt,
            "n_predict": 180,
            "temperature": 0.95,
            "top_p": 0.95,
            "repeat_penalty": 1.15,
            "stop": ["<|im_end|>", "User:", "You:", "\nUser:", "\nYou:", "Assistant:"],
            "stream": True,
        }
        try:
            with requests.post(LLAMA_SERVER_URL, json=payload, stream=True) as r:
                for line in r.iter_lines():
                    if not line:
                        continue
                    line = line.decode("utf-8")
                    if not line.startswith("data: "):
                        continue
                    chunk = json.loads(line[6:]).get("content", "")
                    chunk = chunk.replace("<|im_end|>", "").replace("<|im_start|>", "")
                    if not chunk:
                        continue
                    acc += chunk
                    cut = _second_speaker_cut(acc)
                    if cut is not None:  # stop before the model speaks for the user
                        if cut > sent:
                            yield acc[sent:cut]
                        return
                    yield acc[sent:]
                    sent = len(acc)
        except Exception as e:
            print(f"stream error: {e}")

    return Response(gen(), mimetype="text/plain")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    message = data.get("message")
    prompt = f"""<|im_start|>system
Analyze the user's message and return JSON.
Format:
{{
  "emotion": "string",
  "intent": "string",
  "affection": number (+/-),
  "trust": number (+/-),
  "intimacy": number (+/-),
  "anger": number (+/-)
}}
Only return JSON.
<|im_end|>
<|im_start|>user
{message}
<|im_end|>
<|im_start|>assistant
"""
    result = call_llama(prompt)
    return jsonify({"analysis": result})

@app.route("/extract-memory", methods=["POST"])
def extract_memory():
    data = request.json
    message = data.get("message")
    prompt = f"""<|im_start|>system
Extract important long-term memory from this message.
If nothing important, return: NONE
If important, return JSON:
{{
 "content": "the memory",
 "type": "personal | interest | emotional | event",
 "importance": 1-5
}}
Only return JSON or NONE.
<|im_end|>
<|im_start|>user
{message}
<|im_end|>
<|im_start|>assistant
"""
    result = call_llama(prompt)
    return jsonify({"memory": result})

def clean_intro(text: str) -> str:
    text = re.sub(r"^[A-Za-z\s]+:\s*", "", text)
    text = re.sub(r"(Detailed scene description:|Scene:|Narrator:|Opening Scene:|Scene Description:)", "", text, flags=re.IGNORECASE)
    open_quotes = ['"', '“']
    close_quotes = ['"', '”']
    first_open = -1
    for q in open_quotes:
        pos = text.find(q)
        if pos != -1 and (first_open == -1 or pos < first_open):
            first_open = pos

    if first_open != -1:
        first_close = -1
        for q in close_quotes:
            pos = text.find(q, first_open + 1)
            if pos != -1 and (first_close == -1 or pos < first_close):
                first_close = pos

        if first_close != -1:
            text = text[:first_close + 1]
        else:
            newline_pos = text.find('\n', first_open + 10)
            if newline_pos != -1:
                text = text[:newline_pos]
    text = text.strip()
    content_outside = re.sub(r"\*.*?\*", "", text).strip()
    if content_outside and '"' not in content_outside:
        if not text.endswith("*"):
            last_ast = text.rfind("*")
            if last_ast != -1:
                prefix = text[:last_ast+1]
                suffix = text[last_ast+1:].strip()
                if suffix:
                    text = f'{prefix}\n"{suffix}"'
    return text.strip()

@app.route("/generate-intro-scene", methods=["POST"])
def generate_intro_scene():
    data = request.json
    character_name = data.get("character_name")
    personality = data.get("personality")
    emotion = data.get("emotion")
    description = data.get("description")
    prompt = f"""<|im_start|>system
You are {character_name}. Write the opening scene where you first meet the user.

YOUR PERSONALITY (this drives everything): {personality}
Your current mood: {emotion}
About you: {description}

The scene, your body language, and your first words MUST reflect your personality
above. If you are cold, be curt and commanding. If you are cruel or bossy, be
sharp and dismissive. If you are warm, be warm. Do NOT default to shy, sweet, or
timid unless that is literally your personality.

Format: narration in *asterisks*, your speech in "quotes". Write ONE short scene
(under 80 words) and stop right after your first line of dialogue. Never write or
speak for the user.
<|im_end|>
<|im_start|>assistant
"""
    raw_reply = call_llama(prompt)
    reply = clean_intro(raw_reply)
    return jsonify({"intro": reply})

@app.route("/generate-greeting", methods=["POST"])
def generate_greeting():
    data = request.json
    character_name = data.get("character_name")
    personality = data.get("personality")
    emotion = data.get("emotion")
    description = data.get("description")
    prompt = f"""<|im_start|>system
You are roleplaying as {character_name}.

Character Description:
{description}

Personality:
{personality}

Current Emotion:
{emotion}

You are meeting the user for the first time.

Write a natural first message to start a conversation.
Include small actions like *smiles* or *looks at you*.

Rules:
- Use this format: Narration in italic using * * and Dialogue in "quotes".
- Stay in character
- Be engaging
- Ask a question
- 2-3 sentences
- Do NOT write your name
- Do NOT write "User:"
Only write the message.
<|im_end|>
<|im_start|>assistant
"""
    raw_reply = call_llama(prompt)
    reply = clean_reply(raw_reply, character_name)
    return jsonify({"greeting": reply})

@app.route("/generate-return-greeting", methods=["POST"])
def generate_return_greeting():
    data = request.json
    character_name = data.get("character_name")
    personality = data.get("personality")
    emotion = data.get("emotion")
    relationship_level = data.get("relationship_level")
    memory = data.get("memory")
    hours_away = data.get("hours_away", 0)
    time_context = ""
    if hours_away > 24:
        time_context = "The user has been away for a long time (over a day)."
    elif hours_away > 5:
        time_context = f"The user has been away for {int(hours_away)} hours."
    else:
        time_context = "The user was away for a short time."
    prompt = f"""<|im_start|>system
You are roleplaying as {character_name}.

Personality: {personality}
Current Emotion: {emotion}
Relationship Level: {relationship_level}
{time_context}

Important memories about the user:
{memory}

The user has come back to chat with you again.

Write a natural message to greet them again.
Rules:
- Use this format: Narration in italic using * * and Dialogue in "quotes".
- Act according to relationship level
- Use *actions* (e.g. *smiles*)
- 2-3 sentences max
- Only write the message.
<|im_end|>
<|im_start|>assistant
"""
    raw_reply = call_llama(prompt)
    reply = clean_reply(raw_reply, character_name)
    return jsonify({"greeting": reply})

if __name__ == "__main__":
    # 0.0.0.0 so the EC2 box is reachable; locally it's still fine.
    app.run(host="0.0.0.0", port=8000)
