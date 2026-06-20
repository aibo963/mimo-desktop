export type TTSModel = 'mimo-v2.5-tts' | 'mimo-v2.5-tts-voicedesign' | 'mimo-v2.5-tts-voiceclone'

export const TTS_MODELS: Record<TTSModel, { name: string; description: string }> = {
  'mimo-v2.5-tts': { name: '预置音色', description: '使用内置音色，支持风格控制和唱歌' },
  'mimo-v2.5-tts-voicedesign': { name: '音色设计', description: '用文字描述生成自定义音色' },
  'mimo-v2.5-tts-voiceclone': { name: '音色克隆', description: '上传音频样本克隆音色' },
}

export const PRESET_VOICES = [
  { id: 'mimo_default', name: 'MiMo 默认', lang: 'auto' },
  { id: '冰糖', name: '冰糖', lang: 'zh', gender: 'female' },
  { id: '茉莉', name: '茉莉', lang: 'zh', gender: 'female' },
  { id: '苏打', name: '苏打', lang: 'zh', gender: 'male' },
  { id: '白桦', name: '白桦', lang: 'zh', gender: 'male' },
  { id: 'Mia', name: 'Mia', lang: 'en', gender: 'female' },
  { id: 'Chloe', name: 'Chloe', lang: 'en', gender: 'female' },
  { id: 'Milo', name: 'Milo', lang: 'en', gender: 'male' },
  { id: 'Dean', name: 'Dean', lang: 'en', gender: 'male' },
]

export const STYLE_CATEGORIES = [
  {
    label: '基础情绪',
    styles: ['开心', '悲伤', '愤怒', '恐惧', '惊讶', '兴奋', '委屈', '平静', '冷漠'],
  },
  { label: '复合情绪', styles: ['怅然', '欣慰', '无奈', '愧疚', '释然', '嫉妒', '忐忑', '动情'] },
  { label: '整体基调', styles: ['温柔', '高冷', '活泼', '严肃', '慵懒', '俏皮', '深沉', '干练'] },
  { label: '声线定位', styles: ['磁性', '醇厚', '清亮', '空灵', '稚嫩', '苍老', '甜美', '沙哑'] },
  { label: '角色扮演', styles: ['孙悟空', '林黛玉'] },
  { label: '方言', styles: ['东北话', '四川话', '河南话', '粤语'] },
]
