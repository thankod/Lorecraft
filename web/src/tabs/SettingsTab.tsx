import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../stores/useGameStore'
import { registerTab } from './registry'
import './SettingsTab.css'

const PROVIDERS = [
  { value: 'openai_compatible', label: 'OpenAI 兼容 API' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI 官方' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'xai', label: 'xAI Grok' },
] as const

interface ProviderFields {
  apiKey: string
  model: string
  baseUrl: string
}

const emptyFields: ProviderFields = { apiKey: '', model: '', baseUrl: '' }

function SettingsTab() {
  const llmConfig = useGameStore((s) => s.llmConfig)
  const testResult = useGameStore((s) => s.llmTestResult)
  const modelList = useGameStore((s) => s.llmModels)
  const isProcessing = useGameStore((s) => s.isProcessing)
  const send = useGameStore((s) => s.send)

  const [provider, setProvider] = useState('openai_compatible')
  const fieldsRef = useRef<Record<string, ProviderFields>>({})
  const [fields, setFields] = useState<ProviderFields>(emptyFields)
  const [testing, setTesting] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const serverProviderRef = useRef<string>('')

  const stashFields = useCallback((prov: string, f: ProviderFields) => {
    fieldsRef.current[prov] = { ...f }
  }, [])

  // Request config on mount
  useEffect(() => {
    send({ type: 'get_llm_config' })
  }, [send])

  // Sync form when config loads from server
  useEffect(() => {
    if (llmConfig && llmConfig.provider) {
      serverProviderRef.current = llmConfig.provider
      const f: ProviderFields = {
        apiKey: llmConfig.api_key,
        model: llmConfig.model,
        baseUrl: llmConfig.base_url ?? '',
      }
      fieldsRef.current[llmConfig.provider] = f
      setProvider(llmConfig.provider)
      setFields(f)
    }
  }, [llmConfig])

  useEffect(() => {
    if (testResult) setTesting(false)
  }, [testResult])

  useEffect(() => {
    if (modelList) setLoadingModels(false)
  }, [modelList])

  function handleProviderChange(v: string) {
    stashFields(provider, fields)
    const saved = fieldsRef.current[v]
    setFields(saved ? { ...saved } : { ...emptyFields })
    setProvider(v)
    useGameStore.getState().setLLMModels(null)
    useGameStore.getState().setLLMTestResult(null)
  }

  function updateField(key: keyof ProviderFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function handleTest() {
    setTesting(true)
    useGameStore.getState().setLLMTestResult(null)
    send({
      type: 'test_llm_config',
      provider,
      api_key: fields.apiKey,
      model: fields.model || '',
      ...(provider === 'openai_compatible' && fields.baseUrl ? { base_url: fields.baseUrl } : {}),
    })
  }

  function handleListModels() {
    setLoadingModels(true)
    useGameStore.getState().setLLMModels(null)
    send({
      type: 'list_models',
      provider,
      api_key: fields.apiKey,
      ...(provider === 'openai_compatible' && fields.baseUrl ? { base_url: fields.baseUrl } : {}),
    })
  }

  function handleSave() {
    stashFields(provider, fields)
    send({
      type: 'set_llm_config',
      provider,
      api_key: fields.apiKey,
      model: fields.model,
      ...(provider === 'openai_compatible' && fields.baseUrl ? { base_url: fields.baseUrl } : {}),
    })
  }

  const hasKey = fields.apiKey.trim().length > 0
  const canSave = hasKey && !isProcessing
  const canTest = hasKey && !isProcessing

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <div className="settings-section-title">大模型配置</div>

        {isProcessing && (
          <div className="settings-warn">回合进行中，无法修改配置</div>
        )}

        <div className="settings-field">
          <span className="settings-field-label">服务商</span>
          <select
            className="settings-select"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={isProcessing}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {provider === 'openai_compatible' && (
          <div className="settings-field">
            <span className="settings-field-label">API 地址</span>
            <input
              className="settings-input"
              type="text"
              value={fields.baseUrl}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              placeholder="http://localhost:11434/v1"
              disabled={isProcessing}
            />
            <span className="settings-hint">OpenAI 兼容端点地址</span>
          </div>
        )}

        <div className="settings-field">
          <span className="settings-field-label">API Key</span>
          <div className="settings-key-row">
            <input
              className="settings-input settings-key-input"
              type={showKey ? 'text' : 'password'}
              value={fields.apiKey}
              onChange={(e) => updateField('apiKey', e.target.value)}
              placeholder="sk-..."
              disabled={isProcessing}
            />
            <button
              className="settings-eye-btn"
              type="button"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? '隐藏' : '显示'}
            >
              {showKey ? '\u25C9' : '\u25CE'}
            </button>
          </div>
        </div>

        <div className="settings-field">
          <span className="settings-field-label">模型</span>
          <div className="settings-model-row">
            {modelList && modelList.length > 0 ? (
              <select
                className="settings-select settings-model-select"
                value={fields.model}
                onChange={(e) => updateField('model', e.target.value)}
                disabled={isProcessing}
              >
                <option value="">默认模型</option>
                {modelList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                className="settings-input settings-model-input"
                type="text"
                value={fields.model}
                onChange={(e) => updateField('model', e.target.value)}
                placeholder={provider === 'gemini' ? 'gemini-2.5-flash' : provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o'}
                disabled={isProcessing}
              />
            )}
            <button
              className="settings-fetch-btn"
              disabled={!canTest || loadingModels}
              onClick={handleListModels}
              title="获取模型列表"
            >
              {loadingModels ? '...' : '获取列表'}
            </button>
          </div>
          <span className="settings-hint">留空使用默认模型，或点击获取可用列表</span>
        </div>

        <div className="settings-actions">
          <button
            className="settings-test-btn"
            disabled={!canTest || testing}
            onClick={handleTest}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            className="settings-save-btn"
            disabled={!canSave}
            onClick={handleSave}
          >
            保存并应用
          </button>
        </div>

        {testResult && (
          <div className={`settings-test-result ${testResult.success ? 'success' : 'fail'}`}>
            {testResult.success ? '连接成功' : `连接失败: ${testResult.message}`}
          </div>
        )}
      </div>
    </div>
  )
}

registerTab({ id: 'settings', label: '设置', component: SettingsTab })
