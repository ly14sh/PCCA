<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAuthApi } from '@/composables/useApi'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close', 'success'])

const userStore = useUserStore()
const { login, sendSms, checkLoginInfo, webLogin, fetchCaptchaImage } = useAuthApi()

const loginMode = ref('web')  // web | password | sms
const loading = ref(false)
const error = ref('')

// 账号密码
const username = ref('')
const password = ref('')
const captcha = ref('')
const captchaImg = ref('')
const requestHash = ref('')

// 短信
const phone = ref('')
const smsCode = ref('')
const smsSent = ref(false)
const smsCountdown = ref(0)

const title = computed(() => {
  if (loginMode.value === 'web') return 'WebView 登录'
  if (loginMode.value === 'password') return '账号密码登录'
  return '短信验证码登录'
})

// WebView 登录
async function handleWebLogin() {
  loading.value = true
  error.value = ''
  try {
    const res = await webLogin()
    if (res && res.code === 0) {
      await userStore.loadUser()
      emit('success')
      emit('close')
    } else {
      error.value = res?.message || '登录失败'
    }
  } catch (e) {
    error.value = '登录出错：' + e.message
  } finally {
    loading.value = false
  }
}

// 账号密码登录
async function handlePasswordLogin() {
  if (!username.value || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await login(username.value, password.value, captcha.value, requestHash.value, 'password')
    if (res && res.code === 0) {
      await userStore.loadUser()
      emit('success')
      emit('close')
    } else if (res && res.code === 2) {
      // 需要验证码
      error.value = res.message || '请输入验证码'
      if (res.requestHash) requestHash.value = res.requestHash
      if (res.captchaImage) captchaImg.value = res.captchaImage
    } else {
      error.value = res?.message || '登录失败'
      if (res?.requestHash) {
        requestHash.value = res.requestHash
        await loadCaptcha()
      }
    }
  } catch (e) {
    error.value = '登录出错：' + e.message
  } finally {
    loading.value = false
  }
}

// 短信登录
async function handleSendSms() {
  if (!phone.value) {
    error.value = '请输入手机号'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await sendSms(phone.value, requestHash.value)
    if (res && res.code === 0) {
      smsSent.value = true
      requestHash.value = res.data?.requestHash || requestHash.value
      startCountdown()
    } else {
      error.value = res?.message || '发送失败'
    }
  } catch (e) {
    error.value = '发送出错：' + e.message
  } finally {
    loading.value = false
  }
}

async function handleSmsLogin() {
  if (!smsCode.value) {
    error.value = '请输入验证码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await login(phone.value, smsCode.value, '', requestHash.value, 'sms')
    if (res && res.code === 0) {
      await userStore.loadUser()
      emit('success')
      emit('close')
    } else {
      error.value = res?.message || '登录失败'
    }
  } catch (e) {
    error.value = '登录出错：' + e.message
  } finally {
    loading.value = false
  }
}

async function loadCaptcha() {
  try {
    const res = await fetchCaptchaImage()
    if (res && res.captchaImage) captchaImg.value = res.captchaImage
    else if (res && res.data) captchaImg.value = res.data
  } catch {}
}

function startCountdown() {
  smsCountdown.value = 60
  const timer = setInterval(() => {
    smsCountdown.value--
    if (smsCountdown.value <= 0) clearInterval(timer)
  }, 1000)
}

function switchMode(mode) {
  loginMode.value = mode
  error.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <!-- WebView 登录（默认） -->
          <div v-if="loginMode === 'web'" class="login-web">
            <div class="web-icon">🌐</div>
            <p class="web-hint">通过酷安官方页面安全登录，推荐使用</p>
            <div v-if="error" class="error-msg">{{ error }}</div>
            <button class="btn-primary" @click="handleWebLogin" :disabled="loading">
              {{ loading ? '打开中...' : '打开登录页面' }}
            </button>
          </div>

          <!-- 账号密码登录 -->
          <div v-if="loginMode === 'password'" class="login-form">
            <input v-model="username" placeholder="用户名/手机号/邮箱" @keydown.enter="$refs.pwdInput?.focus()">
            <input ref="pwdInput" v-model="password" type="password" placeholder="密码" @keydown.enter="handlePasswordLogin">
            <div v-if="captchaImg" class="captcha-row">
              <input v-model="captcha" placeholder="验证码" @keydown.enter="handlePasswordLogin">
              <img :src="captchaImg" @click="loadCaptcha" class="captcha-img" title="点击刷新">
            </div>
            <div v-if="error" class="error-msg">{{ error }}</div>
            <button class="btn-primary" @click="handlePasswordLogin" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </div>

          <!-- 短信登录 -->
          <div v-if="loginMode === 'sms'" class="login-form">
            <input v-model="phone" placeholder="手机号" @keydown.enter="handleSendSms">
            <div v-if="smsSent" class="sms-row">
              <input v-model="smsCode" placeholder="验证码" @keydown.enter="handleSmsLogin">
              <button class="btn-sms" @click="handleSendSms" :disabled="smsCountdown > 0">
                {{ smsCountdown > 0 ? `${smsCountdown}s` : '重新发送' }}
              </button>
            </div>
            <div v-if="error" class="error-msg">{{ error }}</div>
            <button v-if="!smsSent" class="btn-primary" @click="handleSendSms" :disabled="loading">
              {{ loading ? '发送中...' : '发送验证码' }}
            </button>
            <button v-else class="btn-primary" @click="handleSmsLogin" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </div>

          <!-- 切换登录方式 -->
          <div class="mode-switch">
            <button :class="{ active: loginMode === 'web' }" @click="switchMode('web')">WebView</button>
            <button :class="{ active: loginMode === 'password' }" @click="switchMode('password')">账号密码</button>
            <button :class="{ active: loginMode === 'sms' }" @click="switchMode('sms')">短信验证</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  width: 380px;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--border);
  box-shadow: 0 16px 48px rgba(0,0,0,0.4);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.login-web {
  text-align: center;
  padding: 10px 0;
}

.web-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.web-hint {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-form input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
}

.login-form input:focus {
  border-color: var(--accent);
}

.captcha-row {
  display: flex;
  gap: 8px;
}

.captcha-row input {
  flex: 1;
}

.captcha-img {
  height: 40px;
  border-radius: var(--radius);
  cursor: pointer;
}

.sms-row {
  display: flex;
  gap: 8px;
}

.sms-row input {
  flex: 1;
}

.btn-sms {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  padding: 0 14px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-sms:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  margin-top: 4px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: var(--red);
  font-size: 13px;
  text-align: center;
}

.mode-switch {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.mode-switch button {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.mode-switch button:hover {
  color: var(--text-primary);
}

.mode-switch button.active {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
}
</style>
