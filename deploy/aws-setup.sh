#!/usr/bin/env bash
# One-time setup for the Intimo AI box on an AWS EC2 GPU instance.
# Works on Amazon Linux 2023 (ec2-user) and Ubuntu (ubuntu) Deep Learning AMIs
# that ship the NVIDIA driver + CUDA. Run as the default user:  bash aws-setup.sh
set -euo pipefail

MODELS=/opt/models
LLAMA=/opt/llama.cpp
APP=/opt/InitimoApp
MAIN_GGUF="$MODELS/mythomax-l2-13b.Q4_K_M.gguf"
DRAFT_GGUF="$MODELS/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"

# Shared secret the backend must send. Override by exporting AI_API_KEY before running.
AI_API_KEY="${AI_API_KEY:-$(openssl rand -hex 16)}"

echo "==> Installing build deps"
if command -v dnf >/dev/null; then
  # curl is already present as curl-minimal on AL2023; installing full curl conflicts.
  sudo dnf install -y gcc gcc-c++ make cmake git python3 python3-pip openssl
else
  sudo apt-get update -y
  sudo apt-get install -y build-essential cmake git python3-venv python3-pip curl openssl
fi

echo "==> Building llama.cpp with CUDA"
sudo mkdir -p "$LLAMA" && sudo chown "$USER" "$LLAMA"
[ -d "$LLAMA/.git" ] || git clone https://github.com/ggml-org/llama.cpp "$LLAMA"
cd "$LLAMA"
cmake -B build -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j"$(nproc)"

echo "==> Downloading models (~8GB, one time)"
sudo mkdir -p "$MODELS" && sudo chown "$USER" "$MODELS"
[ -f "$MAIN_GGUF" ] || curl -L -o "$MAIN_GGUF" \
  "https://huggingface.co/TheBloke/MythoMax-L2-13B-GGUF/resolve/main/mythomax-l2-13b.Q4_K_M.gguf?download=true"
[ -f "$DRAFT_GGUF" ] || curl -L -o "$DRAFT_GGUF" \
  "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf?download=true"

echo "==> Setting up the Flask AI app"
sudo mkdir -p "$APP" && sudo chown "$USER" "$APP"
[ -d "$APP/.git" ] || git clone https://github.com/notAryan10/InitimoApp "$APP"
cd "$APP" && git pull --ff-only || true
python3 -m venv "$APP/ai/.venv"
"$APP/ai/.venv/bin/pip" install -r "$APP/ai/requirements.txt"

echo "==> Writing systemd services (auto-start on boot)"
sudo tee /etc/systemd/system/llama.service >/dev/null <<EOF
[Unit]
Description=llama.cpp server (MythoMax + speculative decoding)
After=network.target
[Service]
User=$USER
ExecStart=$LLAMA/build/bin/llama-server -m $MAIN_GGUF -md $DRAFT_GGUF \\
  --spec-draft-n-max 16 --spec-draft-n-min 4 \\
  --port 8080 --ctx-size 4096 -ngl 99 -ngld 99 -fa on
Restart=always
[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/intimo-ai.service >/dev/null <<EOF
[Unit]
Description=Intimo Flask AI proxy
After=llama.service
[Service]
User=$USER
WorkingDirectory=$APP/ai
Environment=AI_API_KEY=$AI_API_KEY
ExecStart=$APP/ai/.venv/bin/python $APP/ai/app.py
Restart=always
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now llama.service intimo-ai.service

echo
echo "================ DONE ================"
echo "AI box is up. It auto-starts whenever you start this EC2 instance."
echo
echo "  AI_KEY  (set this on Render):  $AI_API_KEY"
echo "  AI_URL  (set this on Render):  http://<YOUR_ELASTIC_IP>:8000"
echo
echo "Open port 8000 in the instance security group, then test:"
echo "  curl -s http://localhost:8000/generate -X POST -H 'Content-Type: application/json' \\"
echo "    -H 'X-API-Key: $AI_API_KEY' -d '{\"prompt\":\"User: hi\\nAssistant:\"}'"
