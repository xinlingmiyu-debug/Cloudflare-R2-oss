<template>
  <Dialog :modelValue="showDialog" @update:modelValue="onDialogClose">
    <div v-if="file" class="text-editor" @click.stop>
      <div class="text-editor-header">
        <div class="text-editor-info">
          <div class="text-editor-filename" v-text="file.key.split('/').pop()"></div>
          <div class="text-editor-meta">
            <span v-text="displayType"></span>
            <span v-text="formatSize(file.size)"></span>
          </div>
        </div>
        <div class="text-editor-actions">
          <button
            class="text-editor-action"
            :class="{ active: wordWrap }"
            @click="wordWrap = !wordWrap"
          >
            自动换行
          </button>
          <button
            class="text-editor-action primary"
            :disabled="saving || !dirty"
            @click="save"
          >
            {{ saving ? "保存中..." : "保存" }}
          </button>
          <button class="text-editor-action" @click="close">关闭</button>
        </div>
      </div>
      <div class="text-editor-body">
        <textarea
          v-model="content"
          class="text-editor-textarea"
          :style="textareaStyle"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
        ></textarea>
        <div v-if="loading" class="text-editor-loading">加载中...</div>
      </div>
      <div v-if="error" class="text-editor-error" v-text="error"></div>
    </div>
  </Dialog>
</template>

<script>
import { detectTextMimeType } from "/assets/main.mjs";
import Dialog from "./Dialog.vue";

export default {
  props: {
    modelValue: Boolean,
    file: {
      type: Object,
      default: null,
    },
  },

  emits: ["update:modelValue", "saved"],

  data: () => ({
    content: "",
    originalContent: "",
    loading: false,
    saving: false,
    error: "",
    wordWrap: true,
  }),

  computed: {
    showDialog() {
      return this.modelValue;
    },

    dirty() {
      return this.content !== this.originalContent;
    },

    displayType() {
      const type = this.file?.httpMetadata?.contentType;
      if (type && type !== "application/octet-stream") return type;
      return detectTextMimeType(this.file?.key) || "text/plain";
    },

    textareaStyle() {
      return {
        whiteSpace: this.wordWrap ? "pre-wrap" : "pre",
        overflowWrap: this.wordWrap ? "break-word" : "normal",
      };
    },
  },

  watch: {
    modelValue(value) {
      if (value && this.file) {
        this.load();
      } else if (!value) {
        this.reset();
      }
    },

    file() {
      if (this.modelValue && this.file) this.load();
    },
  },

  methods: {
    formatSize(size) {
      const units = ["B", "KB", "MB", "GB", "TB"];
      let i = 0;
      while (size >= 1024) {
        size /= 1024;
        i++;
      }
      return `${size.toFixed(1)} ${units[i]}`;
    },

    reset() {
      this.content = "";
      this.originalContent = "";
      this.error = "";
      this.loading = false;
      this.saving = false;
    },

    async load() {
      this.reset();
      this.loading = true;
      try {
        const response = await fetch(`/raw/${this.file.key}`);
        if (!response.ok) {
          throw new Error(`加载失败 (${response.status})`);
        }
        const text = await response.text();
        this.content = text;
        this.originalContent = text;
      } catch (err) {
        this.error = err.message || "加载文件失败";
      } finally {
        this.loading = false;
      }
    },

    async save() {
      if (!this.dirty || this.saving) return;
      this.saving = true;
      this.error = "";
      try {
        const contentType = this.getSaveContentType();
        const blob = new Blob([this.content], { type: contentType });
        await axios.put(`/api/write/items/${this.file.key}`, blob, {
          headers: { "content-type": contentType },
        });
        this.originalContent = this.content;
        this.$emit("saved");
      } catch (err) {
        let message = "保存失败";
        if (err.response) {
          const detail =
            typeof err.response.data === "string" && err.response.data
              ? err.response.data
              : err.message;
          message = `保存失败 (${err.response.status}): ${detail}`;
        } else if (err.message) {
          message = err.message;
        }
        this.error = message;
      } finally {
        this.saving = false;
      }
    },

    getSaveContentType() {
      const current = this.file?.httpMetadata?.contentType;
      if (current && current !== "application/octet-stream") {
        return current;
      }
      return detectTextMimeType(this.file?.key) || "text/plain";
    },

    close() {
      this.onDialogClose(false);
    },

    onDialogClose(value) {
      if (!value) {
        if (this.dirty && !window.confirm("有未保存的更改，确定要关闭吗？")) {
          return;
        }
      }
      this.$emit("update:modelValue", value);
    },
  },

  components: {
    Dialog,
  },
};
</script>

<style>
.text-editor {
  width: min(1000px, 94vw);
  height: min(760px, 88vh);
  display: flex;
  flex-direction: column;
  background-color: white;
}

.text-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.text-editor-info {
  min-width: 0;
}

.text-editor-filename {
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.text-editor-meta {
  margin-top: 4px;
  color: dimgray;
  font-size: 0.8em;
}

.text-editor-meta > span + span {
  margin-left: 8px;
}

.text-editor-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.text-editor-action {
  padding: 8px 14px;
  border-radius: 6px;
  background-color: #f5f5f5;
  color: #333;
  font-size: 0.9em;
  transition: background-color 0.15s ease;
}

.text-editor-action:hover:not(:disabled) {
  background-color: #e8e8e8;
}

.text-editor-action.active {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.text-editor-action.primary {
  background-color: rgb(243, 128, 32);
  color: white;
}

.text-editor-action.primary:hover:not(:disabled) {
  background-color: rgb(220, 110, 20);
}

.text-editor-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.text-editor-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

.text-editor-textarea {
  width: 100%;
  height: 100%;
  resize: none;
  border: none;
  outline: none;
  padding: 12px 16px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
    "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #1f2937;
  background-color: #fafafa;
  tab-size: 2;
}

.text-editor-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  color: dimgray;
}

.text-editor-error {
  padding: 10px 16px;
  background-color: #fee2e2;
  color: #991b1b;
  font-size: 0.9em;
  flex-shrink: 0;
}

@media only screen and (max-width: 600px) {
  .text-editor-header {
    flex-direction: column;
    align-items: stretch;
  }

  .text-editor-actions {
    justify-content: flex-end;
  }
}
</style>
