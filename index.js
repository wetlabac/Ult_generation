import { getContext } from "../../../extensions.js";
import { saveBase64AsFile } from "../../../utils.js";
import { humanizedDateTime } from "../../../RossAscends-mods.js";
import { addOneMessage, saveChat } from "../../../../script.js";

const hostname = window.location.hostname;
const DEFAULT_COMFY_URL = `http://${hostname}:8188`;
const COMFY_URL_KEY = "deepgelbooru_comfy_url";
const REQUEST_TIMEOUT_MS = 180000;
const ANALYZE_NODE_ID = "33";

const WORKFLOW_ANALYZE = {
    "28": { "inputs": { "image": "example.png" }, "class_type": "LoadImage" },
    "30": {
        "inputs": {
            "general_threshold": 0.5,
            "character_threshold": 0.5,
            "drop_overlap": false,
            "image": ["28", 0]
        },
        "class_type": "ImgUtilsDeepGelbooru"
    },
    "33": { "inputs": { "source": ["30", 0] }, "class_type": "PreviewAny" }
};

function getComfyUrl() {
    const input = document.getElementById("dd-comfy-url");
    const saved = localStorage.getItem(COMFY_URL_KEY);
    const value = input?.value?.trim() || saved || DEFAULT_COMFY_URL;
    return value.replace(/\/+$/, "");
}

function setComfyUrl(value) {
    const normalized = value.trim().replace(/\/+$/, "");
    if (!normalized) throw new Error("Укажи адрес ComfyUI.");
    localStorage.setItem(COMFY_URL_KEY, normalized);
    const input = document.getElementById("dd-comfy-url");
    if (input) input.value = normalized;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error.name === "AbortError") throw new Error(`Истекло время ожидания: ${url}`);
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

async function getNodeInfo(nodeName) {
    const response = await fetchWithTimeout(`${getComfyUrl()}/object_info/${encodeURIComponent(nodeName)}`);
    if (!response.ok) throw new Error(`ComfyUI не вернул данные узла ${nodeName} (${response.status}).`);
    return response.json();
}

function getComboOptions(nodeInfo, nodeName, inputName) {
    const definition = nodeInfo?.[nodeName]?.input?.required?.[inputName];
    if (Array.isArray(definition?.[0])) return definition[0];
    if (Array.isArray(definition?.[1]?.options)) return definition[1].options;
    return [];
}

async function getAvailableCheckpoints() {
    try {
        const info = await getNodeInfo("CheckpointLoaderSimple");
        return getComboOptions(info, "CheckpointLoaderSimple", "ckpt_name");
    } catch (e) {
        return [];
    }
}

async function getAvailableLoras() {
    try {
        const info = await getNodeInfo("LoraLoader");
        return getComboOptions(info, "LoraLoader", "lora_name");
    } catch (error) {
        return [];
    }
}

function normalizeName(value) {
    return String(value ?? "").normalize("NFKC").replace(/\.[^.]+$/, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function getActiveCharacterName() {
    const context = getContext();
    const character = context.characters?.[context.characterId];
    return character?.name?.trim() || "";
}

async function findLoraForCharacter(characterName) {
    const wanted = normalizeName(characterName);
    const availableLoras = await getAvailableLoras();
    if (availableLoras.length === 0) throw new Error("Список LoRA из ComfyUI пуст.");
    const mapped = availableLoras.map(file => {
        const basename = String(file).split(/[\\/]/).pop();
        return { file, key: normalizeName(basename) };
    });
    let matches = mapped.filter(entry => entry.key === wanted);
    if (matches.length === 0) matches = mapped.filter(entry => entry.key.startsWith(wanted));
    if (matches.length === 0) throw new Error(`Не найдена LoRA для «${characterName}».`);
    if (matches.length > 1) throw new Error(`Найдено несколько LoRA для «${characterName}».`);
    return matches[0].file;
}

function extractTriggerFromLora(loraFileName) {
    const basename = String(loraFileName).split(/[\\/]/).pop();
    return basename.replace(/\.(safetensors|ckpt)$/i, "").trim();
}

async function uploadImageToComfy(file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", "input");
    formData.append("overwrite", "true");
    const response = await fetchWithTimeout(`${getComfyUrl()}/upload/image`, { method: "POST", body: formData });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`Не удалось загрузить изображение (${response.status}): ${details}`);
    }
    const data = await response.json();
    if (!data.name) throw new Error("ComfyUI не вернул имя файла.");
    return data.name;
}

async function queuePrompt(workflow) {
    const response = await fetchWithTimeout(`${getComfyUrl()}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow })
    });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`ComfyUI не принял workflow (${response.status}): ${details}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(`Ошибка workflow: ${JSON.stringify(data.error)}`);
    if (!data.prompt_id) throw new Error("ComfyUI не вернул prompt_id.");
    return data.prompt_id;
}

async function waitForResult(promptId) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
        const response = await fetchWithTimeout(`${getComfyUrl()}/history/${encodeURIComponent(promptId)}`, {}, 15000);
        if (!response.ok) throw new Error(`Не удалось получить результат (${response.status}).`);
        const history = await response.json();
        const entry = history[promptId];
        if (entry) {
            const status = entry.status || {};
            if (status.status_str === "error") throw new Error(`ComfyUI ошибка: ${JSON.stringify(status.messages || status)}`);
            if (status.completed === true || status.status_str === "success" || entry.outputs) return entry;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error("Истекло время ожидания результата.");
}

function collectStrings(value, result = []) {
    if (typeof value === "string") { const text = value.trim(); if (text) result.push(text); return result; }
    if (Array.isArray(value)) { for (const item of value) collectStrings(item, result); return result; }
    if (value && typeof value === "object") { for (const item of Object.values(value)) collectStrings(item, result); }
    return result;
}

function extractTags(entry) {
    const outputs = entry?.outputs || {};
    const candidates = [...collectStrings(outputs[ANALYZE_NODE_ID]), ...collectStrings(outputs)];
    const unique = [...new Set(candidates.map(text => text.trim()).filter(Boolean))];
    if (unique.length === 0) return null;
    unique.sort((a, b) => {
        const score = text => (text.match(/[,，\n]/g) || []).length * 100 + text.length;
        return score(b) - score(a);
    });
    return unique[0];
}

function findMessageTextarea() {
    return document.getElementById("send_textarea") || document.querySelector("textarea#send_textarea");
}

function insertTags(tags) {
    const textarea = findMessageTextarea();
    if (!textarea) throw new Error("Не найдено поле ввода SillyTavern.");
    const currentText = textarea.value || "";
    textarea.value = `${currentText}${currentText.trim() ? ", " : ""}${tags}`;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    textarea.focus();
}

function buildGenerateWorkflow({ tags, checkpoint, lora, extraPrompt }) {
    const trigger = extractTriggerFromLora(lora);
    let positivePrompt = `nsfw, explicit, ${trigger}, 1girl, solo, ${tags}, high quality, detailed illustration, well-composed image`;
    if (extraPrompt) positivePrompt = `${extraPrompt}, ${positivePrompt}`;

    return {
        "1": { "inputs": { "ckpt_name": checkpoint }, "class_type": "CheckpointLoaderSimple" },
        "2": { "inputs": { "lora_name": lora, "strength_model": 0.8, "strength_clip": 0.8, "model": ["1", 0], "clip": ["1", 1] }, "class_type": "LoraLoader" },
        "3": { "inputs": { "text": positivePrompt, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
        "4": { "inputs": { "text": "low quality, blurry, malformed, bad anatomy, text, watermark, duplicate, extra ears", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
        "5": { "inputs": { "width": 1024, "height": 1344, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
        "6": { "inputs": { "seed": Math.floor(Math.random() * Number.MAX_SAFE_INTEGER), "steps": 20, "cfg": 6, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1, "model": ["2", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
        "7": { "inputs": { "samples": ["6", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
        "8": { "inputs": { "filename_prefix": "SillyTavern/Variation", "images": ["7", 0] }, "class_type": "SaveImage" }
    };
}

// Функция извлечения ссылки на картинку из ответа ComfyUI
function getGeneratedImageUrl(entry) {
    for (const output of Object.values(entry?.outputs || {})) {
        if (!Array.isArray(output.images) || output.images.length === 0) continue;
        const image = output.images[0];
        const params = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || "", type: image.type || "output" });
        return `${getComfyUrl()}/view?${params}`;
    }
    return null;
}

// Функция вставки картинки в чат как у Kazuma
async function insertImageToChat(imageUrl, promptText) {
    try {
        toastr.info("Скачиваю картинку...");
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async function() {
            try {
                const base64FullURL = reader.result;
                const base64Raw = base64FullURL.split(',')[1];

                const context = getContext();
                let characterName = "User";
                if (context.groupId) {
                    characterName = context.groups.find(x => x.id === context.groupId)?.id || "Group";
                } else if (context.characterId) {
                    characterName = context.characters[context.characterId]?.name || "User";
                }
                
                const filename = `Variation_${humanizedDateTime()}`;
                const savedPath = await saveBase64AsFile(base64Raw, characterName, filename, "png");

                const mediaAttachment = {
                    url: savedPath,
                    type: "image",
                    source: "generated",
                    title: promptText,
                    generation_type: "free",
                };

                const newMessage = {
                    name: "DeepGelbooru Tagger",
                    is_user: false,
                    is_system: true,
                    send_date: Date.now(),
                    mes: "",
                    extra: {
                        media: [mediaAttachment],
                        media_display: "gallery",
                        media_index: 0,
                        inline_image: false
                    },
                    force_avatar: "img/five.png"
                };

                context.chat.push(newMessage);
                await saveChat();
                
                if (typeof addOneMessage === "function") addOneMessage(newMessage);
                toastr.success("Картинка добавлена в чат!");
            } catch (err) {
                console.error(err);
                toastr.error("Ошибка при сохранении картинки.");
                window.open(imageUrl, '_blank');
            }
        };
    } catch (e) {
        console.error(e);
        toastr.error("Не удалось скачать картинку. Открываю в новой вкладке.");
        window.open(imageUrl, '_blank');
    }
}

function pickFile() {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = () => resolve(input.files?.[0] || null);
        input.click();
    });
}

function promptForText(title, placeholder = "Опиши, что хочешь увидеть...", initialValue = "") {
    return new Promise((resolve) => {
        const modal = document.createElement("div");
        modal.style.cssText = "position:fixed; inset:0; z-index:100000; display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,.8);";
        const box = document.createElement("div");
        box.style.cssText = "background:#1a1a1a; padding:20px; border-radius:8px; width:80%; max-width:500px; display:flex; flex-direction:column; gap:10px;";
        const header = document.createElement("h3");
        header.textContent = title;
        header.style.cssText = "margin:0; color:white;";
        const textarea = document.createElement("textarea");
        textarea.placeholder = placeholder;
        textarea.value = initialValue;
        textarea.style.cssText = "width:100%; height:120px; padding:10px; border-radius:4px; border:1px solid #333; background:#0a0a0a; color:white; resize:vertical;";
        const btnContainer = document.createElement("div");
        btnContainer.style.cssText = "display:flex; justify-content:flex-end; gap:10px;";
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Отмена";
        cancelBtn.className = "menu_button";
        cancelBtn.onclick = () => { document.body.removeChild(modal); resolve(null); };
        const okBtn = document.createElement("button");
        okBtn.textContent = "Сгенерировать";
        okBtn.className = "menu_button";
        okBtn.onclick = () => { document.body.removeChild(modal); resolve(textarea.value.trim()); };
        btnContainer.append(cancelBtn, okBtn);
        box.append(header, textarea, btnContainer);
        modal.appendChild(box);
        document.body.appendChild(modal);
        textarea.focus();
    });
}

async function analyzeImage(file) {
    if (!file) return null;
    toastr.info("Загружаю изображение в ComfyUI…");
    const imageName = await uploadImageToComfy(file);
    const workflow = JSON.parse(JSON.stringify(WORKFLOW_ANALYZE));
    workflow["28"].inputs.image = imageName;
    toastr.info("Анализирую изображение…");
    const promptId = await queuePrompt(workflow);
    const entry = await waitForResult(promptId);
    const tags = extractTags(entry);
    if (!tags) throw new Error("Теги не найдены.");
    return tags;
}

async function handleAnalyze() {
    try {
        const file = await pickFile();
        if (!file) return;
        const tags = await analyzeImage(file);
        const extraPrompt = await promptForText("Редактировать теги и сгенерировать", "Отредактируй теги...", tags);
        if (extraPrompt === null) return;
        await doGenerate(extraPrompt);
    } catch (error) {
        console.error("DeepGelbooru Tagger:", error);
        toastr.error(`Ошибка анализа: ${error.message}`);
    }
}

async function handleVariation() {
    try {
        const file = await pickFile();
        if (!file) return;
        const tags = await analyzeImage(file);
        await doGenerate(tags);
    } catch (error) {
        console.error("DeepGelbooru Variation:", error);
        toastr.error(`Ошибка вариации: ${error.message}`);
    }
}

async function handleGenerateText() {
    try {
        const extraPrompt = await promptForText("Промпт для генерации", "Опиши сцену на английском...");
        if (!extraPrompt) return;
        await doGenerate(extraPrompt);
    } catch (error) {
        console.error("DeepGelbooru Text Generation:", error);
        toastr.error(`Ошибка генерации: ${error.message}`);
    }
}

async function doGenerate(tags) {
    const characterName = getActiveCharacterName();
    const lora = await findLoraForCharacter(characterName);
    
    let checkpoint = document.getElementById("dd-checkpoint")?.value;
    if (!checkpoint) {
        const checkpoints = await getAvailableCheckpoints();
        if (checkpoints.length > 0) {
            checkpoint = checkpoints[0];
            document.getElementById("dd-checkpoint").value = checkpoint;
        } else {
            throw new Error("Не удалось получить список чекпоинтов.");
        }
    }

    toastr.info(`Генерирую для «${characterName}»...`);
    const workflow = buildGenerateWorkflow({ tags, checkpoint, lora, extraPrompt: null });
    const promptId = await queuePrompt(workflow);
    const entry = await waitForResult(promptId);
    const imageUrl = getGeneratedImageUrl(entry);
    if (!imageUrl) throw new Error("Изображение не найдено.");
    
    // ИСПОЛЬЗУЕМ МЕТОД KAZUMA
    await insertImageToChat(imageUrl, tags);
    toastr.success(`Готово! LoRA: ${lora}`);
}

async function populateCheckpointSelect() {
    const select = document.getElementById("dd-checkpoint");
    if (!select) return;
    try {
        const checkpoints = await getAvailableCheckpoints();
        select.replaceChildren();
        if (checkpoints.length === 0) { select.add(new Option("Ошибка загрузки", "")); return; }
        for (const checkpoint of checkpoints) select.add(new Option(checkpoint, checkpoint));
    } catch (error) {
        console.error("Не удалось загрузить список checkpoint:", error);
        select.replaceChildren(new Option("Ошибка загрузки", ""));
    }
}

function addWandButton() {
    if (document.getElementById("dd-wand-btn")) return;
    const container = document.createElement("div");
    container.id = "dd-wand-container";
    container.style.cssText = "display: inline-flex; align-items: center; position: relative;";
    const btn = document.createElement("button");
    btn.id = "dd-wand-btn";
    btn.className = "menu_button";
    btn.title = "DeepGelbooru";
    btn.innerHTML = `<i class="fa-solid fa-camera"></i>`;
    btn.style.cssText = "padding: 5px 8px; font-size: 18px; line-height: 1; background: transparent; border: none; color: white; cursor: pointer;";
    const dropdown = document.createElement("div");
    dropdown.id = "dd-wand-dropdown";
    dropdown.style.cssText = `display: none; position: absolute; bottom: 100%; left: 0; background: #1a1a1a; border: 1px solid #333; border-radius: 4px; padding: 5px 0; z-index: 1000; min-width: 220px; box-shadow: 0 4px 6px rgba(0,0,0,0.5);`;
    const item1 = document.createElement("div");
    item1.textContent = "Импортировать теги";
    item1.style.cssText = "padding: 8px 12px; cursor: pointer; color: #ddd; font-size: 14px;";
    item1.onmouseover = () => item1.style.background = "#333";
    item1.onmouseout = () => item1.style.background = "transparent";
    item1.onclick = () => { dropdown.style.display = "none"; handleAnalyze(); };
    const item2 = document.createElement("div");
    item2.textContent = "Вариация";
    item2.style.cssText = "padding: 8px 12px; cursor: pointer; color: #ddd; font-size: 14px;";
    item2.onmouseover = () => item2.style.background = "#333";
    item2.onmouseout = () => item2.style.background = "transparent";
    item2.onclick = () => { dropdown.style.display = "none"; handleVariation(); };
    const item3 = document.createElement("div");
    item3.textContent = "Создать изображение (по тексту)";
    item3.style.cssText = "padding: 8px 12px; cursor: pointer; color: #ddd; font-size: 14px;";
    item3.onmouseover = () => item3.style.background = "#333";
    item3.onmouseout = () => item3.style.background = "transparent";
    item3.onclick = () => { dropdown.style.display = "none"; handleGenerateText(); };
    dropdown.append(item1, item2, item3);
    let isOpen = false;
    btn.onclick = (e) => { e.stopPropagation(); isOpen = !isOpen; dropdown.style.display = isOpen ? "block" : "none"; };
    document.addEventListener("click", () => { if (isOpen) { isOpen = false; dropdown.style.display = "none"; } });
    container.append(btn, dropdown);
    const sendForm = document.getElementById("send_form");
    if (sendForm) {
        const wand = sendForm.querySelector("#chat_wand_button") || sendForm.querySelector(".fa-wand-magic-sparkles");
        if (wand) wand.parentElement.insertBefore(container, wand.parentElement);
        else sendForm.prepend(container);
    }
}

function addExtensionUI() {
    if (document.getElementById("deepgelbooru-tagger")) return;
    const savedUrl = localStorage.getItem(COMFY_URL_KEY) || DEFAULT_COMFY_URL;
    const html = `
        <div id="deepgelbooru-tagger" class="deepdanbooru-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>DeepGelbooru Tagger</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label for="dd-comfy-url">Адрес ComfyUI</label>
                    <div style="display:flex; gap:8px; margin:6px 0 10px;">
                        <input id="dd-comfy-url" type="url" value="${savedUrl.replace(/"/g, "&quot;")}" placeholder="http://127.0.0.1:8188" style="flex:1; min-width:0;">
                        <button id="dd-save-url-btn" class="menu_button" type="button">Сохранить</button>
                    </div>
                    <label for="dd-checkpoint">Checkpoint</label>
                    <select id="dd-checkpoint" style="width:100%; margin:6px 0 10px;"></select>
                </div>
            </div>
        </div>
    `;
    $("#extensions_settings").append(html);
    $("#dd-save-url-btn").on("click", async () => {
        try { setComfyUrl(document.getElementById("dd-comfy-url").value); await populateCheckpointSelect(); toastr.success("Сохранено."); } catch (e) { toastr.error(e.message); }
    });
    populateCheckpointSelect();
}

jQuery(() => {
    addExtensionUI();
    setTimeout(addWandButton, 1000);
});