import re
import json
import requests
from flask import Flask, request, jsonify, Response, stream_with_context

app = Flask(__name__)

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
You are roleplaying as this character in a story.

Character:
Name: {character_name}
Personality: {personality}
Emotion: {emotion}
Description: {description}

Write ONE opening scene where the character meets the user.

Rules:
- Use this format: Narration in italic using * * and Dialogue in "quotes".
- Write only ONE scene
- Write only ONE interaction
- End the scene immediately after the character speaks
- Do NOT continue the story after the dialogue
- Do NOT start a second scene
- Do NOT add another paragraph after dialogue
- Maximum 120 words

Example:
*She walked into the library and noticed a boy sitting alone by the window. She hesitated for a moment before walking over, holding her book close to her chest.* "Um... hi. Is it okay if I sit here with you?"

Now write the scene and STOP after the dialogue.
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
    app.run(port=8000)
