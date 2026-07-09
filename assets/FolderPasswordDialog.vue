<template>
  <Transition name="fade">
    <div v-if="modelValue" class="dialog-mask" @click.self="onCancel">
      <div class="password-dialog" @click.stop>
        <h3>{{ mode === 'verify' ? '文件夹已加密' : (mode === 'set' ? '设置文件夹密码' : '修改文件夹密码') }}</h3>
        <p v-if="mode === 'verify'">请输入密码以访问该文件夹</p>
        <p v-if="mode === 'set' || mode === 'change'">请输入密码 (留空则取消)</p>
        <form @submit.prevent="onSubmit">
          <div class="password-input-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="mode === 'verify' ? '请输入密码' : '请输入新密码'"
              autofocus
              ref="passwordInput"
            />
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/>
              </svg>
            </button>
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <div class="dialog-buttons">
            <button type="button" class="btn-cancel" @click="onCancel">取消</button>
            <button type="submit" class="btn-submit" :disabled="!password">
              {{ mode === 'verify' ? '确认' : '保存密码' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  props: {
    modelValue: Boolean,
    mode: {
      type: String,
      default: 'verify', // 'verify' | 'set' | 'change'
    },
    folderPath: {
      type: String,
      default: '',
    },
  },

  emits: ['update:modelValue', 'verified', 'cancelled'],

  data() {
    return {
      password: '',
      showPassword: false,
      error: '',
    };
  },

  watch: {
    modelValue(val) {
      if (val) {
        this.password = '';
        this.error = '';
        this.showPassword = false;
        this.$nextTick(() => {
          if (this.$refs.passwordInput) {
            this.$refs.passwordInput.focus();
          }
        });
      }
    },
  },

  methods: {
    async onSubmit() {
      if (!this.password) return;

      if (this.mode === 'verify') {
        try {
          const res = await fetch(`/api/folder_password/${this.folderPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: this.password }),
          });
          const data = await res.json();
          if (data.valid) {
            // 验证通过，保存验证状态到 sessionStorage
            sessionStorage.setItem('folder_password_' + this.folderPath, this.password);
            this.$emit('update:modelValue', false);
            this.$emit('verified', this.folderPath);
          } else {
            this.error = data.message || '密码错误';
          }
        } catch (e) {
          this.error = '验证失败，请重试';
        }
      } else if (this.mode === 'set' || this.mode === 'change') {
        try {
          const res = await axios.put(`/api/folder_password/${this.folderPath}`, {
            password: this.password,
          });
          if (res.data.success) {
            sessionStorage.setItem('folder_password_' + this.folderPath, this.password);
            this.$emit('update:modelValue', false);
            this.$emit('verified', this.folderPath);
          }
        } catch (e) {
          this.error = '设置密码失败，请重试';
        }
      }
    },

    onCancel() {
      this.$emit('update:modelValue', false);
      this.$emit('cancelled');
    },
  },
};
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.password-dialog {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  width: 360px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.password-dialog h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.password-dialog p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.password-input-wrapper input:focus {
  border-color: #4a90d9;
}

.toggle-password {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 4px;
  display: flex;
  align-items: center;
}

.toggle-password:hover {
  color: #666;
}

.error-message {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 8px;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background-color: #f5f5f5;
}

.btn-submit {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-color: #4a90d9;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-submit:hover {
  background-color: #357abd;
}

.btn-submit:disabled {
  background-color: #b0c4de;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>