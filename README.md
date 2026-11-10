# 📷 Ult_Generation for SillyTavern

A powerful SillyTavern extension that combines image analysis (DeepGelbooru) and image generation (ComfyUI) into a seamless workflow. Perfect for roleplaying and visual novel creation.

> ⚠️ **Note:** This extension requires a running ComfyUI instance with the `comfyui-imgutils` plugin. It is intended for advanced users who already have ComfyUI set up locally or on their network. It does not work "out of the box" without ComfyUI.

---

## ✨ Features

- 🔍 **Image Analysis (Import Tags)** — Upload any reference image. The script automatically extracts Danbooru tags via ComfyUI. Edit the tags and send them straight to generation.
- 🎨 **Instant Variation** — Upload an image, and the script will not only extract tags but also immediately generate a new image based on them.
- 💬 **Text-to-Image** — Create images purely from a text prompt, without needing a reference.
- 🧠 **Automatic LoRA Loading** — The script detects the active character in SillyTavern and automatically finds the matching LoRA in your ComfyUI folder. No more manual model selection.
- 📱 **PC & Mobile Support** — Automatically detects the IP address (`window.location.hostname`), allowing use from both desktop and mobile devices on the same network.
- 📸 **In-Chat Image Insertion (Kazuma Method)** — Results are not just opened in a new tab. The image is downloaded, converted to Base64, saved to SillyTavern's image folder, and inserted directly into the chat as an attachment.

---

## 🚀 Installation

### Option A — Install via SillyTavern UI (recommended)

1. Open SillyTavern.
2. Go to **Extensions** (puzzle icon 🧩) → **Install Extension**.
3. Paste the repository URL: https://github.com/wetlabac/Ult_Generation
4. Confirm installation and **restart SillyTavern**.
5. A camera icon (📷) will appear in the message input bar.

### Option B — Manual installation

1. Clone or download this repository.
2. Place the extension folder into your SillyTavern user extensions directory: data/<your-user-handle>/extensions/ult-generation/

Alternatively, for a server-wide install ("Install for all users"), place it in: public/scripts/extensions/third-party/ult-generation/

3. **Restart SillyTavern**.
4. A camera icon (📷) will appear in the message input bar.

> 💡 The folder name `ult-generation` should match the name used in `manifest.json`.

---

## ⚙️ Setup

1. Make sure ComfyUI is running and accessible from your SillyTavern machine.
- Start ComfyUI with `--listen` if you want to access it from other devices (e.g., phone).
2. Open the **Extensions** menu (puzzle icon 🧩) in SillyTavern and find **Ult_generation**.
3. Enter your **ComfyUI URL**, e.g.: http://192.168.0.171:8188

> ⚠️ Do **not** use `127.0.0.1` if you plan to use the extension from a phone or another device on your network.
4. Select your **Checkpoint** from the dropdown.
5. (Optional) Configure any additional settings exposed in the extension panel.

---

## 📖 Usage Examples

### Example 1 — Import tags from a reference image

1. Click the camera icon (📷) in the message input bar.
2. Choose **Import Tags** and upload a reference image.
3. The extension extracts Danbooru tags via ComfyUI and shows them in an editable field.
4. Edit the tags if needed and send them to generation.
5. The generated image is inserted directly into the chat.

### Example 2 — Instant variation

1. Click the camera icon (📷).
2. Choose **Instant Variation** and upload an image.
3. The extension extracts tags **and** immediately generates a new image based on them.
4. The result is inserted into the chat as an attachment.

### Example 3 — Text-to-image

1. Click the camera icon (📷).
2. Choose **Text-to-Image**.
3. Enter a prompt (and optional negative prompt).
4. Click generate — the image is inserted into the chat.

### Example 4 — Automatic LoRA loading

1. Select a character in SillyTavern.
2. Open the extension panel.
3. The extension detects the active character and automatically finds the matching LoRA in your ComfyUI folder.
4. No manual model selection is needed.

---

## 🛠️ Requirements

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) (latest release recommended)
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- [`comfyui-imgutils`](https://github.com/) plugin (provides the `ImgUtilsDeepGelbooru` node)
- ComfyUI network access (start with `--listen` if using from another device)
- A checkpoint and (optionally) LoRA files available in your ComfyUI installation

---

## 🔧 Troubleshooting

- **Camera icon does not appear** — make sure the extension is enabled in the Extensions menu and SillyTavern was restarted.
- **"ComfyUI unavailable" error** — check that ComfyUI is running and the URL is correct. Do not use `127.0.0.1` if accessing from another device.
- **Tags not extracted** — verify that the `comfyui-imgutils` plugin is installed and the `ImgUtilsDeepGelbooru` node is available.
- **LoRA not found** — ensure the character name matches a LoRA filename in your ComfyUI `loras` folder, or configure the mapping manually.

---

## 🔒 Security Notes

- The ComfyUI URL is stored in SillyTavern extension settings. Do **not** store API keys, tokens, or other secrets there — extension settings are stored in plain text and are accessible to other extensions.
- Only connect to ComfyUI instances you trust. Avoid exposing ComfyUI to the public internet without authentication.

---

## 🙏 Credits

- **DeepGelbooru Model** — Created by the [DeepGHS community](https://github.com/DeepGHS) (MIT License).
- **Image Gen Kazuma** — The in-chat image insertion method (Base64 saving) is adapted from the [Image-gen-kazuma](https://github.com/Arif-salah/Image-gen-kazuma) extension by Arif-salah (MIT License).

This project is a derivative work that incorporates ideas and code adapted from the MIT-licensed projects above. Their original copyright notices and license terms are preserved.

---

## ❤️ Support the Developer

If you find this extension useful and want to support its development, you can do so here:

- 🟣 **Boosty:** [https://boosty.to/wetlabac](https://boosty.to/wetlabac)
- 💜 **Tribute:** [https://web.tribute.tg/e/1Pz](https://web.tribute.tg/e/1Pz)

Your support helps cover development time and keeps the extension maintained and compatible with the latest SillyTavern releases. Thank you! 🙏

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

### Why MIT?

This project is a derivative work that builds upon and adapts code and ideas from the following MIT-licensed projects:

- **DeepGelbooru Model** — by the [DeepGHS community](https://github.com/DeepGHS) (MIT License).
- **Image-gen-kazuma** — by [Arif-salah](https://github.com/Arif-salah/Image-gen-kazuma) (MIT License).

Because the original works are distributed under the MIT License, this project is released under the same permissive terms, preserving the original copyright notices and license conditions. This ensures full compliance with the upstream licenses while keeping the extension open and freely usable.

### Note on official SillyTavern repository submission

If this extension is submitted to the official SillyTavern content repository, the SillyTavern team recommends **AGPLv3** for extensions. MIT is a libre license and is fully compatible with the open-source requirement, but the maintainers may request relicensing under AGPLv3. In that case, the MIT attribution for the original works above will be preserved, as required by their licenses.

---

## 🤝 Contributing

Issues and pull requests are welcome. Please:
- Keep the code compatible with the latest SillyTavern release.
- Follow the existing code style.
- Update the README if you add or change features.

---

## 📬 Contact

- GitHub: [wetlabac](https://github.com/wetlabac)
- For official SillyTavern repository submissions, contact the SillyTavern developers via their Discord server.
