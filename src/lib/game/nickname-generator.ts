// 形容词列表（50个）
const adjectives = [
  '萌萌哒', '胖乎乎', '圆滚滚', '软绵绵', '懒洋洋',
  '喜洋洋', '亮晶晶', '香喷喷', '乐陶陶', '气呼呼',
  '傻乎乎', '乐悠悠', '慢吞吞', '闹哄哄', '静悄悄',
  '暖洋洋', '凉飕飕', '乐滋滋', '甜津津', '兴冲冲',
  '奇奇怪怪', '迷迷糊糊', '虎头虎脑', '意气风发', '神采奕奕',
  '憨态可掬', '威风凛凛', '气宇轩昂', '仙气飘飘', '奶里奶气',
  '傻里傻气', '呆头呆脑', '聪明伶俐', '活蹦乱跳', '气度不凡',
  '谈笑风生', '悠闲自在', '放荡不羁', '桀骜不驯', '文质彬彬',
  '仪表堂堂', '气场全开', '雄赳赳', '气昂昂', '眉飞色舞',
  '红彤彤', '金灿灿', '白茫茫', '汗淋淋', '绿油油'
]

// 名词列表（50个）
const nouns = [
  '打工人', '咸鱼', '显眼包', '吗喽', '小趴菜',
  '脆皮大学生', '纯爱战士', '社交悍匪', '精神小伙', '气氛组',
  '冤大头', '倒霉蛋', '锦鲤', '螺丝钉', '泡面',
  '杠精', '老六', '电灯泡', '边角料', '全村的希望',
  '社恐', '社牛', '吃货', '特种兵', '单身狗',
  '熬夜冠军', '退堂鼓选手', '干饭人', '追剧狂', '游戏迷',
  '背锅侠', '柠檬精', '键盘侠', '复读机', '鸽子王',
  '潜水员', '老司机', '萌新', '考证党', '带货主播',
  '健身达人', '美食博主', '技术大佬', '这种队友', '气氛组长',
  '修图大师', '剪辑大手', '拖延症患者', '早起困难户', '这种心态'
]

/**
 * 生成随机昵称：形容词 + 的 + 名词
 * 例如：勇敢的小猫、聪明的狮子
 */
export function generateRandomNickname(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adjective}的${noun}`
}

/**
 * 生成多个不重复的随机昵称
 */
export function generateUniqueNicknames(count: number): string[] {
  const nicknames = new Set<string>()
  const maxAttempts = count * 10 // 防止无限循环

  let attempts = 0
  while (nicknames.size < count && attempts < maxAttempts) {
    nicknames.add(generateRandomNickname())
    attempts++
  }

  return Array.from(nicknames)
}

/**
 * 检查昵称是否为随机生成格式
 */
export function isRandomNickname(nickname: string): boolean {
  // 检查是否符合"XX的XX"格式
  const parts = nickname.split('的')
  if (parts.length !== 2) return false

  const [adj, noun] = parts
  return adjectives.includes(adj) && nouns.includes(noun)
}

// 导出列表供其他地方使用
export { adjectives, nouns }
