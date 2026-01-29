import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Classic word pairs for "Who is the Spy" game
  const wordPairs = [
    { wordA: '橙子', wordB: '橘子' }, // Orange vs Tangerine
    { wordA: '面包', wordB: '馒头' }, // Bread vs Steamed bun
    { wordA: '眉毛', wordB: '胡须' }, // Eyebrow vs Beard
    { wordA: '饺子', wordB: '包子' }, // Dumpling vs Bun
    { wordA: '摩托车', wordB: '电动车' }, // Motorcycle vs Electric bike
    { wordA: '高跟鞋', wordB: '增高鞋' }, // High heels vs Elevator shoes
    { wordA: '汉堡', wordB: '肉夹馍' }, // Hamburger vs Chinese burger
    { wordA: '洗发水', wordB: '护发素' }, // Shampoo vs Conditioner
    { wordA: '同学', wordB: '同桌' }, // Classmate vs Deskmate
    { wordA: '状元', wordB: '冠军' }, // Top scholar vs Champion
    { wordA: '饼干', wordB: '薯片' }, // Biscuit vs Chips
    { wordA: '口红', wordB: '唇彩' }, // Lipstick vs Lip gloss
    { wordA: '小沈阳', wordB: '宋小宝' }, // Xiao Shenyang vs Song Xiaobao
    { wordA: '董永', wordB: '许仙' }, // Dong Yong vs Xu Xian
    { wordA: '自行车', wordB: '电动车' }, // Bicycle vs Electric bike
    { wordA: '牛奶', wordB: '豆浆' }, // Milk vs Soy milk
    { wordA: '玫瑰', wordB: '月季' }, // Rose vs Chinese rose
    { wordA: '浓眉大眼', wordB: '眉清目秀' }, // Thick eyebrows vs Delicate features
    { wordA: '保安', wordB: '保镖' }, // Security guard vs Bodyguard
    { wordA: '白菜', wordB: '生菜' }, // Chinese cabbage vs Lettuce
    { wordA: '辣椒', wordB: '芥末' }, // Chili vs Wasabi
    { wordA: '金庸', wordB: '古龙' }, // Jin Yong vs Gu Long
    { wordA: '麻将', wordB: '扑克' }, // Mahjong vs Poker
    { wordA: '北京', wordB: '东京' }, // Beijing vs Tokyo
    { wordA: '报纸', wordB: '杂志' }, // Newspaper vs Magazine
    { wordA: '双胞胎', wordB: '龙凤胎' }, // Twins vs Boy-girl twins
    { wordA: '手机', wordB: '座机' }, // Mobile phone vs Landline
    { wordA: '作家', wordB: '编剧' }, // Writer vs Screenwriter
    { wordA: '钢琴', wordB: '吉他' }, // Piano vs Guitar
    { wordA: '空调', wordB: '风扇' }, // Air conditioner vs Fan
  ]

  for (const pair of wordPairs) {
    await prisma.wordPair.create({
      data: pair,
    })
  }

  console.log(`✅ Seeded ${wordPairs.length} word pairs`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
