const fallbackCategories = [
  { id: 'auto-help', name: 'Автодопомога', slug: 'auto-help', sort_order: 10 }
];

const fallbackProducts = [
  {
    id: 'drivekit-gl-965a',
    name: 'DRIVEKIT GL-965A 4-в-1',
    slug: 'drivekit-gl-965a',
    price: 2190,
    compare_price: null,
    description: 'Пускозарядний пристрій, компресор до 150 PSI, Power Bank та LED-ліхтар.',
    category_id: 'auto-help',
    category: fallbackCategories[0],
    image_url: 'https://drops.in.ua/img/p/132259953/0.webp',
    gallery: [
      'https://drops.in.ua/img/p/132259953/0.webp',
      'https://drops.in.ua/img/p/132259953/1.webp',
      'https://drops.in.ua/img/p/132259953/2.webp',
      'https://drops.in.ua/img/p/132259953/3.webp',
      'https://drops.in.ua/img/p/132259953/4.webp',
      'https://drops.in.ua/img/p/132259953/5.webp'
    ],
    stock: 20,
    active: true,
    sort_order: 10
  }
];

module.exports = { fallbackCategories, fallbackProducts };
