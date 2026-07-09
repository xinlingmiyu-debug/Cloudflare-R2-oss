<script setup>
import { ref, watch, computed, nextTick } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  file: Object,
  content: String,
});

const emit = defineEmits(['update:modelValue', 'save', 'refresh']);

const text = ref('');
const saving = ref(false);
const changed = ref(false);
const error = ref('');

const fileName = computed(() => {
  if (!props.file) return '';
  return props.file.key.split('/').pop();
});

const lineCount = computed(() => {
  return text.value.split('\n').length;
});

watch(() => props.modelValue, (val) => {
  if (val) {
    text.value = props.content || '';
    changed.value = false;
    error.value = '';
  }
});

watch(text, () => {
  changed.value = true;
}, { deep: false });

function onKeydown(e) {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    save();
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    text.value = text.value.substring(0, start) + '\t' + text.value.substring(end);
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1;
    });
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const blob = new Blob([text.value], { type: 'text/plain; charset=utf-8' });
    const uploadUrl = `/api/write/items/${props.file.key}`;
    await axios.put(uploadUrl, blob);
    changed.value = false;
    emit('save');
    emit('refresh');
  } catch (e) {
    if (e.response && e.response.status === 401) {
      fetch('/api/write/')
        .then((value) => {
          if (value.redirected) window.location.href = value.url;
        })
        .catch(() => {});
    }
    error.value = '保存失败: ' + (e.message || '未知错误');
  } finally {
    saving.value = false;
  }
}

function close() {
  if (changed.value) {
    if (!window.confirm('文件已修改，确定不保存就关闭吗？')) return;
  }
  emit('update:modelValue', false);
}
</script>

<template>
  <Transition name="fade">
    <div v-if="modelValue" class="editor-mask" @click.self="close">
      <div class="editor-container">
        <div class="editor-header">
          <span class="editor-title" :title="props.file?.key">{{ fileName }}</span>
          <span v-if="changed" class="editor-changed">已修改</span>
          <span v-if="error" class="editor-error">{{ error }}</span>
          <div class="editor-actions">
            <button class="editor-btn editor-save-btn" @click="save" :disabled="saving" title="保存 (Ctrl+S)">
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <button class="editor-btn editor-close-btn" @click="close" title="关闭">关闭</button>
          </div>
        </div>
        <div class="editor-body">
          <div class="editor-line-numbers">
            <div v-for="n in lineCount" :key="n" class="editor-line-num">{{ n }}</div>
          </div>
          <textarea
            class="editor-textarea"
            v-model="text"
            @keydown="onKeydown"
            spellcheck="false"
            placeholder="文件内容为空"
          ></textarea>
        </div>
        <div class="editor-footer">
          <span>行数: {{ lineCount }}</span>
          <span>字符: {{ text.length }}</span>
          <span>Ctrl+S 保存</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.editor-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
}

.editor-container {
  background-color: #1e1e1e;
  border-radius: 8px;
  width: 90vw;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #2d2d2d;
  color: #ccc;
  flex-shrink: 0;
  gap: 12px;
}

.editor-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.editor-changed {
  color: #f39c12;
  font-size: 0.85em;
  white-space: nowrap;
}

.editor-error {
  color: #e74c3c;
  font-size: 0.85em;
  white-space: nowrap;
}

.editor-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.editor-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.editor-save-btn {
  background-color: #f38020;
  color: #fff;
}

.editor-save-btn:hover:not(:disabled) {
  background-color: #e06a10;
}

.editor-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.editor-close-btn {
  background-color: #444;
  color: #ccc;
}

.editor-close-btn:hover {
  background-color: #c0392b;
  color: #fff;
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.editor-line-numbers {
  padding: 12px 0;
  background-color: #252526;
  color: #858585;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  text-align: right;
  user-select: none;
  overflow: hidden;
  flex-shrink: 0;
  min-width: 48px;
}

.editor-line-num {
  padding: 0 12px 0 8px;
}

.editor-textarea {
  flex: 1;
  padding: 12px 16px;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  tab-size: 4;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.editor-textarea::placeholder {
  color: #666;
}

.editor-footer {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  background-color: #007acc;
  color: #fff;
  font-size: 12px;
  gap: 16px;
  flex-shrink: 0;
}
</style>