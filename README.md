# 📷 Ult\_generation for SillyTavern

# A powerful SillyTavern extension that combines image analysis (DeepGelbooru) and image generation (ComfyUI) into a seamless workflow. Perfect for roleplaying and visual novel creation.

# 

# ✨ Features

# 🔍 Image Analysis (Import Tags): Upload any reference image. The script automatically extracts Danbooru tags via ComfyUI. Edit the tags and send them straight to generation.

# 🎨 Instant Variation: Upload an image, and the script will not only extract tags but also immediately generate a new image based on them.

# 💬 Text-to-Image: Create images purely from a text prompt, without needing a reference.

# 🧠 Automatic LoRA Loading: The script detects the active character in SillyTavern and automatically finds the matching LoRA in your ComfyUI folder. No more manual model selection.

# 📱 PC \& Mobile Support: Automatically detects the IP address (window.location.hostname), allowing use from both desktop and mobile devices on the same network.

# 📸 In-Chat Image Insertion (Kazuma Method): Results are not just opened in a new tab. The image is downloaded, converted to Base64, saved to SillyTavern's image folder, and inserted directly into the chat as an attachment.

# 🚀 Installation

# Download index.js and manifest.json.

# Place them in your SillyTavern folder:

# SillyTavern/public/scripts/extensions/third-party/ult-generation/

# Restart SillyTavern.

# A camera icon (📷) will appear in the message input bar. Click it to open the menu.

# ⚙️ Setup

# Open the Extensions menu (puzzle icon 🧩) and find Ult\_generation.

# Enter your ComfyUI URL (e.g., http://192.168.0.171:8188). Do not use 127.0.0.1 if you plan to use a phone.

# Select your Checkpoint from the dropdown.

# 🛠️ Requirements

# SillyTavern

# ComfyUI

# comfyui-imgutils plugin (for the ImgUtilsDeepGelbooru node)

# ComfyUI network access (start with --listen)

# 🙏 Credits

# DeepGelbooru Model: Created by the DeepGHS community (MIT License).

# Image Gen Kazuma: The in-chat image insertion method (Base64 saving) is adapted from the Image-gen-kazuma extension by Arif-salah (MIT License).

# 📜 License

# This project is licensed under the MIT License. See the LICENSE file for details.

